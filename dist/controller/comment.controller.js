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
exports.getComments = getComments;
exports.createComment = createComment;
exports.deleteComment = deleteComment;
const mongoose_1 = __importDefault(require("mongoose"));
const postModel_1 = require("../model/postModel");
const userModel_1 = require("../model/userModel");
const AppError_1 = require("../config/AppError");
const serializer_1 = require("../utils/serializer");
const cursor_1 = require("../utils/cursor");
function parseId(raw, notFoundMessage) {
    const id = String(raw);
    if (!mongoose_1.default.isValidObjectId(id))
        throw new AppError_1.AppError(404, notFoundMessage);
    return id;
}
function getComments(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const postId = parseId(req.params.id, "Post not found");
        if (!(yield postModel_1.Post.exists({ _id: postId })))
            throw new AppError_1.AppError(404, "Post not found");
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const filter = { post: postId };
        const cursor = (0, cursor_1.decodeCursor)(req.query.cursor);
        if (cursor) {
            filter.$or = [
                { createdAt: { $lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
            ];
        }
        const docs = yield Comment.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1);
        const hasMore = docs.length > limit;
        const page = hasMore ? docs.slice(0, limit) : docs;
        // One query for all authors
        const authorIds = [...new Set(page.map((c) => c.author.toString()))];
        const authors = yield userModel_1.user.find({ _id: { $in: authorIds } });
        const authorMap = new Map(authors.map((a) => [a.id, a]));
        const comments = page.flatMap((c) => {
            const author = authorMap.get(c.author.toString());
            return author ? [(0, serializer_1.toComment)(c, author)] : [];
        });
        res.json({
            comments,
            nextCursor: hasMore ? (0, cursor_1.encodeCursor)(page[page.length - 1]) : null,
        });
    });
}
function createComment(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { text } = req.body;
        const postId = parseId(req.params.id, "Post not found");
        if (!(yield postModel_1.Post.exists({ _id: postId })))
            throw new AppError_1.AppError(404, "Post not found");
        const author = yield userModel_1.user.findById(req.userId);
        if (!author)
            throw new AppError_1.AppError(404, "User not found");
        const comment = yield Comment.create({ post: postId, author: author._id, text });
        const post = yield postModel_1.Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } }, { new: true });
        if (!post) {
            // Post was deleted between our check and now
            yield comment.deleteOne();
            throw new AppError_1.AppError(404, "Post not found");
        }
        res.status(201).json({
            comment: (0, serializer_1.toComment)(comment, author),
            commentsCount: post.commentsCount,
        });
    });
}
function deleteComment(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const commentId = parseId(req.params.id, "Comment not found");
        const comment = yield Comment.findById(commentId);
        if (!comment)
            throw new AppError_1.AppError(404, "Comment not found");
        const post = yield postModel_1.Post.findById(comment.post).select("author commentsCount");
        const isCommentAuthor = comment.author.toString() === req.userId;
        const isPostAuthor = (post === null || post === void 0 ? void 0 : post.author.toString()) === req.userId;
        if (!isCommentAuthor && !isPostAuthor && req.userRole !== "admin") {
            throw new AppError_1.AppError(403, "You can't delete this comment");
        }
        const result = yield Comment.deleteOne({ _id: comment._id });
        // Only decrement if we really removed it, and never go below zero
        let commentsCount = (_a = post === null || post === void 0 ? void 0 : post.commentsCount) !== null && _a !== void 0 ? _a : 0;
        if (result.deletedCount && post) {
            const updated = yield postModel_1.Post.findOneAndUpdate({ _id: post._id, commentsCount: { $gt: 0 } }, { $inc: { commentsCount: -1 } }, { new: true });
            commentsCount = (_b = updated === null || updated === void 0 ? void 0 : updated.commentsCount) !== null && _b !== void 0 ? _b : 0;
        }
        res.json({ message: "Comment deleted", commentsCount });
    });
}
