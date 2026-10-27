"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = getStats;
exports.listUsers = listUsers;
exports.getUser = getUser;
exports.verifyUser = verifyUser;
exports.suspendUser = suspendUser;
exports.unsuspendUser = unsuspendUser;
exports.updateRole = updateRole;
exports.deleteUser = deleteUser;
const mongoose_1 = __importDefault(require("mongoose"));
const userModel_1 = require("../model/userModel");
const otp_1 = require("../model/otp");
const AppError_1 = require("../config/AppError");
const escapeRegex_1 = require("../utils/escapeRegex");
const serializer_1 = require("../utils/serializer");
const upload_service_1 = require("../services/upload.service");
const bookMark_1 = require("../model/bookMark");
const postModel_1 = require("../model/postModel");
const post_service_1 = require("../services/post.service");
const likeModel_1 = require("../model/likeModel");
const commentModel_1 = require("../model/commentModel");
function findTarget(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!mongoose_1.default.isValidObjectId(id))
            throw new AppError_1.AppError(400, "Invalid user id");
        const User = yield userModel_1.user.findById(id);
        if (!User)
            throw new AppError_1.AppError(404, "User not found");
        return User;
    });
}
function assertNotSelf(req, targetId) {
    if (req.userId === targetId) {
        throw new AppError_1.AppError(400, "You can't do this to your own account");
    }
}
function assertNotAdmin(user) {
    if (user.role === "admin") {
        throw new AppError_1.AppError(400, "Demote this admin to a regular user first");
    }
}
function getStats(_req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [total, verified, suspended, admins, newThisWeek] = yield Promise.all([
            userModel_1.user.countDocuments(),
            userModel_1.user.countDocuments({ isVerified: true }),
            userModel_1.user.countDocuments({ isSuspended: true }),
            userModel_1.user.countDocuments({ role: "admin" }),
            userModel_1.user.countDocuments({ createdAt: { $gte: weekAgo } }),
        ]);
        res.json({
            stats: { total, verified, unverified: total - verified, suspended, admins, newThisWeek },
        });
    });
}
function listUsers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const filter = {};
        const status = req.query.status;
        if (status === "verified")
            filter.isVerified = true;
        else if (status === "unverified")
            filter.isVerified = false;
        else if (status === "suspended")
            filter.isSuspended = true;
        if (typeof req.query.q === "string" && req.query.q.trim()) {
            const prefix = new RegExp(`^${(0, escapeRegex_1.escapeRegex)(req.query.q.trim().toLowerCase())}`);
            filter.$or = [{ userName: prefix }, { email: prefix }];
        }
        const [users, total] = yield Promise.all([
            userModel_1.user.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            userModel_1.user.countDocuments(filter),
        ]);
        res.json({
            users: users.map(serializer_1.toAdminUser),
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
    });
}
function getUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetUser = yield findTarget(String(req.params.id));
        res.json({ user: (0, serializer_1.toAdminUser)(targetUser) });
    });
}
function verifyUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetUser = yield findTarget(String(req.params.id));
        targetUser.isVerified = true;
        yield targetUser.save();
        yield otp_1.Otp.deleteOne({ user: targetUser.id, type: "verify" }); // code no longer needed
        res.json({ user: (0, serializer_1.toAdminUser)(targetUser) });
    });
}
function suspendUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetUser = yield findTarget(String(req.params.id));
        assertNotSelf(req, targetUser.id);
        assertNotAdmin(targetUser);
        targetUser.isSuspended = true;
        yield targetUser.save();
        res.json({ user: (0, serializer_1.toAdminUser)(targetUser) });
    });
}
function unsuspendUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetUser = yield findTarget(String(req.params.id));
        targetUser.isSuspended = false;
        yield targetUser.save();
        res.json({ user: (0, serializer_1.toAdminUser)(targetUser) });
    });
}
function updateRole(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { role } = req.body;
        const targetUser = yield findTarget(String(req.params.id));
        assertNotSelf(req, targetUser.id);
        targetUser.role = role;
        yield targetUser.save();
        res.json({ user: (0, serializer_1.toAdminUser)(targetUser) });
    });
}
function deleteUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetUser = yield findTarget(String(req.params.id));
        assertNotSelf(req, targetUser.id);
        assertNotAdmin(targetUser);
        yield targetUser.deleteOne();
        yield otp_1.Otp.deleteMany({ user: targetUser.id });
        yield bookMark_1.Bookmark.deleteMany({ user: targetUser.id });
        // Best effort, same pattern as removeAvatar
        (0, upload_service_1.deleteAsset)((0, upload_service_1.avatarPublicId)(targetUser.id)).catch((err) => console.error("Failed to delete avatar asset:", err));
        const posts = yield postModel_1.Post.find({ author: targetUser._id });
        yield (0, post_service_1.removePosts)(posts);
        // TODO (Days 8-10): also delete this user's posts, likes and comments
        const likes = yield likeModel_1.Like.find({ user: targetUser.id }).select("post");
        if (likes.length > 0) {
            yield postModel_1.Post.bulkWrite(likes.map((l) => ({
                updateOne: {
                    filter: { _id: l.post, likesCount: { $gt: 0 } },
                    update: { $inc: { likesCount: -1 } },
                },
            })));
            yield likeModel_1.Like.deleteMany({ user: targetUser.id });
        }
        // Remove this user's comments on other posts, and fix those posts' counters
        const perPost = yield commentModel_1.Comment.aggregate([
            { $match: { author: targetUser._id } },
            { $group: { _id: "$post", count: { $sum: 1 } } },
        ]);
        if (perPost.length > 0) {
            yield postModel_1.Post.bulkWrite(perPost.map((p) => ({
                updateOne: {
                    filter: { _id: p._id, commentsCount: { $gte: p.count } },
                    update: { $inc: { commentsCount: -p.count } },
                },
            })));
            yield commentModel_1.Comment.deleteMany({ author: targetUser._id });
        }
        res.json({ message: "User deleted" });
    });
}
