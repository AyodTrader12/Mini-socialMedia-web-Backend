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
exports.likePost = likePost;
exports.unlikePost = unlikePost;
const mongoose_1 = __importDefault(require("mongoose"));
const postModel_1 = require("../model/postModel");
const likeModel_1 = require("../model/likeModel");
const AppError_1 = require("../config/AppError");
function parsePostId(raw) {
    const id = String(raw);
    if (!mongoose_1.default.isValidObjectId(id))
        throw new AppError_1.AppError(404, "Post not found");
    return id;
}
function likePost(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const postId = parsePostId(req.params.id);
        if (!(yield postModel_1.Post.exists({ _id: postId })))
            throw new AppError_1.AppError(404, "Post not found");
        let created = true;
        try {
            yield likeModel_1.Like.create({ user: req.userId, Post: postId });
        }
        catch (err) {
            if (err.code !== 11000)
                throw err;
            created = false; // already liked
        }
        // Only count the like if it was actually new
        const post = created
            ? yield postModel_1.Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } }, { new: true })
            : yield postModel_1.Post.findById(postId);
        if (!post) {
            // Post was deleted between our check and now
            yield likeModel_1.Like.deleteOne({ user: req.userId, post: postId });
            throw new AppError_1.AppError(404, "Post not found");
        }
        res.json({ liked: true, likesCount: post.likesCount });
    });
}
function unlikePost(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const postId = parsePostId(req.params.id);
        const result = yield likeModel_1.Like.deleteOne({ user: req.userId, post: postId });
        // Only decrement if a like was actually removed, and never go below zero
        const post = (_a = (result.deletedCount
            ? yield postModel_1.Post.findOneAndUpdate({ _id: postId, likesCount: { $gt: 0 } }, { $inc: { likesCount: -1 } }, { new: true })
            : null)) !== null && _a !== void 0 ? _a : (yield postModel_1.Post.findById(postId));
        res.json({ liked: false, likesCount: (_b = post === null || post === void 0 ? void 0 : post.likesCount) !== null && _b !== void 0 ? _b : 0 });
    });
}
