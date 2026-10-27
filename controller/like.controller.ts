import { Request, Response } from "express";
import mongoose from "mongoose";
import { Post } from "../model/postModel";
import { Like } from "../model/likeModel";
import { AppError } from "../config/AppError";

function parsePostId(raw: unknown) {
  const id = String(raw);
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, "Post not found");
  return id;
}

export async function likePost(req: Request, res: Response) {
  const postId = parsePostId(req.params.id);

  if (!(await Post.exists({ _id: postId }))) throw new AppError(404, "Post not found");

  let created = true;
  try {
    await Like.create({ user: req.userId, post: postId });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    created = false; // already liked
  }

  // Only count the like if it was actually new
  const post = created
    ? await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } }, { new: true })
    : await Post.findById(postId);

  if (!post) {
    // Post was deleted between our check and now
    await Like.deleteOne({ user: req.userId, post: postId });
    throw new AppError(404, "Post not found");
  }

  res.json({ liked: true, likesCount: post.likesCount });
}

export async function unlikePost(req: Request, res: Response) {
  const postId = parsePostId(req.params.id);

  const result = await Like.deleteOne({ user: req.userId, post: postId });

  // Only decrement if a like was actually removed, and never go below zero
  const post =
    (result.deletedCount
      ? await Post.findOneAndUpdate(
          { _id: postId, likesCount: { $gt: 0 } },
          { $inc: { likesCount: -1 } },
          { new: true }
        )
      : null) ?? (await Post.findById(postId));

  res.json({ liked: false, likesCount: post?.likesCount ?? 0 });
}