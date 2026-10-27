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
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertValidPost = assertValidPost;
exports.uploadPostMedia = uploadPostMedia;
exports.deletePostMedia = deletePostMedia;
exports.serializePosts = serializePosts;
exports.getPostsPage = getPostsPage;
exports.getSavedPostsPage = getSavedPostsPage;
exports.removePosts = removePosts;
const limits_1 = require("../config/limits");
const AppError_1 = require("../config/AppError");
const upload_service_1 = require("./upload.service");
const cursor_1 = require("../utils/cursor");
const serializer_1 = require("../utils/serializer");
const postModel_1 = require("../model/postModel");
const userModel_1 = require("../model/userModel");
const bookMark_1 = require("../model/bookMark");
const likeModel_1 = require("../model/likeModel");
const commentModel_1 = require("../model/commentModel");
// export async function uploadPostMedia(files: Express.Multer.File[]): Promise<PostMedia[]> {
//   if (files.length === 0) return [];
//   // ...rest unchanged
// }
const isVideo = (file) => file.mimetype.startsWith("video/");
/** Enforces: at least 1 file, and either all images (each within size) or exactly one video. */
/** A post needs a caption or media. Media, if present, is either all images or exactly one video. */
function assertValidPost(caption, files) {
    if (files.length === 0) {
        if (!(caption === null || caption === void 0 ? void 0 : caption.trim())) {
            throw new AppError_1.AppError(400, "Write something or attach an image or video");
        }
        return;
    }
    const hasVideo = files.some(isVideo);
    if (hasVideo) {
        if (files.length > 1) {
            throw new AppError_1.AppError(400, "A post can have one video or up to 10 images, not both");
        }
        return;
    }
    for (const file of files) {
        if (file.size > limits_1.LIMITS.imageSize) {
            throw new AppError_1.AppError(400, "Each image must be 5MB or smaller");
        }
    }
}
function uploadOne(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const video = isVideo(file);
        const result = yield (0, upload_service_1.uploadBuffer)(file.buffer, Object.assign({ folder: "mini-social/posts", resource_type: video ? "video" : "image" }, (video ? {} : { transformation: [{ width: 1600, crop: "limit", quality: "auto" }] })));
        return {
            url: result.secure_url,
            publicId: result.public_id,
            type: video ? "video" : "image",
            width: result.width,
            height: result.height,
        };
    });
}
/** Uploads all files in parallel. If any fails, deletes the ones that succeeded and throws. */
function uploadPostMedia(files) {
    return __awaiter(this, void 0, void 0, function* () {
        if (files.length === 0)
            return [];
        const results = yield Promise.allSettled(files.map(uploadOne));
        const uploaded = [];
        let failure = null;
        for (const result of results) {
            if (result.status === "fulfilled")
                uploaded.push(result.value);
            else
                failure !== null && failure !== void 0 ? failure : (failure = result.reason);
        }
        if (failure) {
            yield deletePostMedia(uploaded);
            throw failure;
        }
        return uploaded;
    });
}
function deletePostMedia(media) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.allSettled(media.map((m) => (0, upload_service_1.deleteAsset)(m.publicId, m.type)));
    });
}
/** Of these post IDs, which has the viewer saved? */
function getBookmarkedIds(viewerId, postIds) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!viewerId || postIds.length === 0)
            return new Set();
        const rows = yield bookMark_1.Bookmark.find({ user: viewerId, post: { $in: postIds } }).select("post");
        return new Set(rows.map((r) => r.post.toString()));
    });
}
function getLikedIds(viewerId, postIds) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!viewerId || postIds.length === 0)
            return new Set();
        const rows = yield likeModel_1.Like.find({ user: viewerId, post: { $in: postIds } }).select("post");
        return new Set(rows.map((r) => r.post.toString()));
    });
}
/** Turns post documents into API objects: loads authors and viewer flags in bulk. */
function serializePosts(docs, viewerId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (docs.length === 0)
            return [];
        const authorIds = [...new Set(docs.map((p) => p.author.toString()))];
        const postIds = docs.map((p) => p._id);
        const [authors, bookmarked, liked] = yield Promise.all([
            userModel_1.user.find({ _id: { $in: authorIds } }),
            getBookmarkedIds(viewerId, postIds),
            getLikedIds(viewerId, postIds),
        ]);
        const authorMap = new Map(authors.map((a) => [a.id, a]));
        return docs.flatMap((post) => {
            const author = authorMap.get(post.author.toString());
            if (!author)
                return [];
            return [
                (0, serializer_1.toPost)(post, author, {
                    liked: liked.has(post.id),
                    bookmarked: bookmarked.has(post.id),
                }),
            ];
        });
    });
}
function getPostsPage(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const limit = Math.min(30, Math.max(1, Number(opts.limit) || 10));
        const filter = Object.assign({}, opts.filter);
        const cursor = (0, cursor_1.decodeCursor)(opts.cursor);
        if (cursor) {
            filter.$or = [
                { createdAt: { $lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
            ];
        }
        const docs = yield postModel_1.Post.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1);
        const hasMore = docs.length > limit;
        const page = hasMore ? docs.slice(0, limit) : docs;
        return {
            posts: yield serializePosts(page, opts.viewerId),
            nextCursor: hasMore ? (0, cursor_1.encodeCursor)(page[page.length - 1]) : null,
        };
    });
}
function getSavedPostsPage(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const limit = Math.min(30, Math.max(1, Number(opts.limit) || 10));
        const filter = { user: opts.viewerId };
        // The cursor here points at a Bookmark (when you saved it), not at a Post
        const cursor = (0, cursor_1.decodeCursor)(opts.cursor);
        if (cursor) {
            filter.$or = [
                { createdAt: { $lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
            ];
        }
        const rows = yield bookMark_1.Bookmark.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1);
        const hasMore = rows.length > limit;
        const page = hasMore ? rows.slice(0, limit) : rows;
        const posts = yield postModel_1.Post.find({ _id: { $in: page.map((r) => r.post) } });
        const postMap = new Map(posts.map((p) => [p.id, p]));
        // Keep the order you saved them in, and skip posts that no longer exist
        const ordered = page.flatMap((row) => {
            const post = postMap.get(row.post.toString());
            return post ? [post] : [];
        });
        return {
            posts: yield serializePosts(ordered, opts.viewerId),
            nextCursor: hasMore ? (0, cursor_1.encodeCursor)(page[page.length - 1]) : null,
        };
    });
}
/** Deletes posts and everything attached to them. */
function removePosts(posts) {
    return __awaiter(this, void 0, void 0, function* () {
        if (posts.length === 0)
            return;
        const ids = posts.map((p) => p._id);
        yield postModel_1.Post.deleteMany({ _id: { $in: ids } });
        yield bookMark_1.Bookmark.deleteMany({ post: { $in: ids } });
        yield likeModel_1.Like.deleteMany({ post: { $in: ids } });
        yield commentModel_1.Comment.deleteMany({ post: { $in: ids } });
        // Cloudinary cleanup is best effort and doesn't block the response.
        // deletePostMedia uses allSettled, so it never throws.
        const media = posts.flatMap((p) => p.media.map((m) => ({ publicId: m.publicId, type: m.type })));
        void deletePostMedia(media);
    });
}
