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
exports.createPost = createPost;
exports.getFeed = getFeed;
exports.getPostById = getPostById;
exports.editPost = editPost;
exports.deletePost = deletePost;
const AppError_1 = require("../config/AppError");
const userModel_1 = require("../model/userModel");
const postModel_1 = require("../model/postModel");
// import { CreatePostInput } from "../validators/post.validator";
const serializer_1 = require("../utils/serializer");
const post_service_1 = require("../services/post.service");
const mongoose_1 = __importDefault(require("mongoose"));
const post_service_2 = require("../services/post.service");
const post_service_3 = require("../services/post.service");
const post_service_4 = require("../services/post.service");
function createPost(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { caption } = req.body;
        const files = (_a = req.files) !== null && _a !== void 0 ? _a : [];
        (0, post_service_1.assertValidPost)(caption, files);
        const author = yield userModel_1.user.findById(req.userId);
        if (!author)
            throw new AppError_1.AppError(404, "User not found");
        const media = yield (0, post_service_1.uploadPostMedia)(files);
        // If saving fails, don't leave the uploaded files orphaned
        const post = yield postModel_1.Post.create({
            author: author._id,
            caption: caption !== null && caption !== void 0 ? caption : "",
            media,
        }).catch((err) => __awaiter(this, void 0, void 0, function* () {
            yield (0, post_service_1.deletePostMedia)(media);
            throw err;
        }));
        res.status(201).json({ post: (0, serializer_1.toPost)(post, author) });
    });
}
function getFeed(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield (0, post_service_2.getPostsPage)({
            cursor: req.query.cursor,
            limit: req.query.limit,
            viewerId: req.userId,
        });
        res.json(result);
    });
}
function getPostById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const id = String(req.params.id);
        if (!mongoose_1.default.isValidObjectId(id))
            throw new AppError_1.AppError(404, "Post not found");
        const post = yield postModel_1.Post.findById(id);
        if (!post)
            throw new AppError_1.AppError(404, "Post not found");
        const [serialized] = yield (0, post_service_3.serializePosts)([post], req.userId);
        if (!serialized)
            throw new AppError_1.AppError(404, "Post not found"); // author was deleted
        res.json({ post: serialized });
    });
}
function findPostOr404(rawId) {
    return __awaiter(this, void 0, void 0, function* () {
        const id = String(rawId);
        if (!mongoose_1.default.isValidObjectId(id))
            throw new AppError_1.AppError(404, "Post not found");
        const post = yield postModel_1.Post.findById(id);
        if (!post)
            throw new AppError_1.AppError(404, "Post not found");
        return post;
    });
}
function editPost(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { caption } = req.body;
        const post = yield findPostOr404(req.params.id);
        if (post.author.toString() !== req.userId) {
            throw new AppError_1.AppError(403, "You can only edit your own posts");
        }
        // A text-only post with no caption would be an empty post
        if (caption === "" && post.media.length === 0) {
            throw new AppError_1.AppError(400, "A text post can't be empty. Delete it instead");
        }
        // Saving the same text isn't an edit
        if (caption !== post.caption) {
            post.caption = caption;
            post.editedAt = new Date();
            yield post.save();
        }
        const [serialized] = yield (0, post_service_3.serializePosts)([post], req.userId);
        if (!serialized)
            throw new AppError_1.AppError(404, "Post not found");
        res.json({ post: serialized });
    });
}
function deletePost(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const post = yield findPostOr404(req.params.id);
        const isOwner = post.author.toString() === req.userId;
        if (!isOwner && req.userRole !== "admin") {
            throw new AppError_1.AppError(403, "You can only delete your own posts");
        }
        yield (0, post_service_4.removePosts)([post]);
        res.json({ message: "Post deleted" });
    });
}
