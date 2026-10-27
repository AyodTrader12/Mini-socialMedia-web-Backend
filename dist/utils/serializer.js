"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicProfile = toPublicProfile;
exports.toPublicUser = toPublicUser;
exports.toAdminUser = toAdminUser;
exports.toPostAuthor = toPostAuthor;
exports.toPost = toPost;
exports.toComment = toComment;
// Safe for anyone to see
function toPublicProfile(user) {
    return {
        id: user._id,
        userName: user.userName,
        fullName: user.fullName,
        bio: user.bio,
        avatar: user.avatar,
        createdAt: user.createdAt,
    };
}
// For the logged-in user's own account only
function toPublicUser(user) {
    return Object.assign(Object.assign({}, toPublicProfile(user)), { email: user.email, isVerified: user.isVerified, role: user.role });
}
function toAdminUser(user) {
    return Object.assign(Object.assign({}, toPublicUser(user)), { isSuspended: user.isSuspended, providers: user.providers.map((p) => p.providers), updatedAt: user.updatedAt });
}
function toPostAuthor(user) {
    return {
        id: user._id,
        username: user.userName,
        fullName: user.fullName,
        avatar: user.avatar,
    };
}
function toPost(post, author, viewer = { liked: false, bookmarked: false }) {
    var _a;
    return {
        id: post._id,
        author: toPostAuthor(author),
        caption: post.caption,
        media: post.media.map((m) => ({
            url: m.url,
            type: m.type,
            width: m.width,
            height: m.height,
        })),
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        likedByMe: viewer.liked,
        bookmarkedByMe: viewer.bookmarked,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        editedAt: (_a = post.editedAt) !== null && _a !== void 0 ? _a : null,
    };
}
function toComment(comment, author) {
    return {
        id: comment._id,
        postId: comment.post,
        author: toPostAuthor(author),
        text: comment.text,
        createdAt: comment.createdAt,
    };
}
