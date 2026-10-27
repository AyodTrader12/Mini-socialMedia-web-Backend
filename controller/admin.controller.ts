import { Request,Response } from "express";
import mongoose from "mongoose";
import { user } from "../model/userModel";
import { Otp } from "../model/otp";
import { AppError } from "../config/AppError";
import { escapeRegex } from "../utils/escapeRegex";
import { UpdateRoleInput } from "../validators/admin.validator";
import { toAdminUser } from "../utils/serializer";
import { deleteAsset,avatarPublicId } from "../services/upload.service";
import { Bookmark } from "../model/bookMark";
import { Post } from "../model/postModel";
import { removePosts } from "../services/post.service";
import {Like} from "../model/likeModel"
import { Comment } from "../model/commentModel";
async function findTarget(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, "Invalid user id");
  const User = await user.findById(id);
  if (!User) throw new AppError(404, "User not found");
  return User;
}

function assertNotSelf(req: Request, targetId: string) {
  if (req.userId === targetId) {
    throw new AppError(400, "You can't do this to your own account");
  }
}

function assertNotAdmin(user: { role: string }) {
  if (user.role === "admin") {
    throw new AppError(400, "Demote this admin to a regular user first");
  }
}

export async function getStats(_req: Request, res: Response) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, verified, suspended, admins, newThisWeek] = await Promise.all([
    user.countDocuments(),
    user.countDocuments({ isVerified: true }),
    user.countDocuments({ isSuspended: true }),
    user.countDocuments({ role: "admin" }),
    user.countDocuments({ createdAt: { $gte: weekAgo } }),
  ]);

  res.json({
    stats: { total, verified, unverified: total - verified, suspended, admins, newThisWeek },
  });
}

export async function listUsers(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const filter: Record<string, unknown> = {};

  const status = req.query.status;
  if (status === "verified") filter.isVerified = true;
  else if (status === "unverified") filter.isVerified = false;
  else if (status === "suspended") filter.isSuspended = true;

  if (typeof req.query.q === "string" && req.query.q.trim()) {
    const prefix = new RegExp(`^${escapeRegex(req.query.q.trim().toLowerCase())}`);
    filter.$or = [{ username: prefix }, { email: prefix }];
  }

  const [users, total] = await Promise.all([
    user.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    user.countDocuments(filter),
  ]);

  res.json({
    users: users.map(toAdminUser),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export async function getUser(req: Request, res: Response) {
  const user = await findTarget(String(req.params.id));
  res.json({ user: toAdminUser(user) });
}

export async function verifyUser(req: Request, res: Response) {
  const user = await findTarget(String(req.params.id));

  user.isVerified = true;
  await user.save();
  await Otp.deleteOne({ user: user.id, type: "verify" }); // code no longer needed

  res.json({ user: toAdminUser(user) });
}

export async function suspendUser(req: Request, res: Response) {
  const user = await findTarget(String(req.params.id));
  assertNotSelf(req, user.id);
  assertNotAdmin(user);

  user.isSuspended = true;
  await user.save();

  res.json({ user: toAdminUser(user) });
}

export async function unsuspendUser(req: Request, res: Response) {
  const user = await findTarget(String(req.params.id));

  user.isSuspended = false;
  await user.save();

  res.json({ user: toAdminUser(user) });
}

export async function updateRole(req: Request, res: Response) {
  const { role } = req.body as UpdateRoleInput;
  const user = await findTarget(String(req.params.id));
  assertNotSelf(req, user.id);

  user.role = role;
  await user.save();

  res.json({ user: toAdminUser(user) });
}

export async function deleteUser(req: Request, res: Response) {
  const user = await findTarget(String(req.params.id));
  assertNotSelf(req, user.id);
  assertNotAdmin(user);

  await user.deleteOne();
  await Otp.deleteMany({ user: user.id });
  
  await Bookmark.deleteMany({ user: user.id });

  // Best effort, same pattern as removeAvatar
  deleteAsset(avatarPublicId(user.id)).catch((err) =>
    console.error("Failed to delete avatar asset:", err)
  );
  const posts = await Post.find({ author: user._id });
  await removePosts(posts);
  // TODO (Days 8-10): also delete this user's posts, likes and comments
 const likes = await Like.find({ user: user.id }).select("post");
  if (likes.length > 0) {
    await Post.bulkWrite(
      likes.map((l) => ({
        updateOne: {
          filter: { _id: l.post, likesCount: { $gt: 0 } },
          update: { $inc: { likesCount: -1 } },
        },
      }))
    );
    await Like.deleteMany({ user: user.id });
  }
    // Remove this user's comments on other posts, and fix those posts' counters
  const perPost = await Comment.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { author: user._id } },
    { $group: { _id: "$post", count: { $sum: 1 } } },
  ]);
  if (perPost.length > 0) {
    await Post.bulkWrite(
      perPost.map((p) => ({
        updateOne: {
          filter: { _id: p._id, commentsCount: { $gte: p.count } },
          update: { $inc: { commentsCount: -p.count } },
        },
      }))
    );
    await Comment.deleteMany({ author: user._id });
  }
  res.json({ message: "User deleted" });
}

