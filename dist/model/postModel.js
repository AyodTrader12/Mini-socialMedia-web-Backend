"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Post = void 0;
const limits_1 = require("../config/limits");
const mongoose_1 = require("mongoose");
const mediaSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], required: true },
    width: { type: Number },
    height: { type: Number },
}, { _id: false });
const postSchema = new mongoose_1.Schema({
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    caption: { type: String, trim: true, maxlength: limits_1.LIMITS.captionLength, default: "" },
    media: {
        type: [mediaSchema],
        default: [],
        validate: {
            validator: (arr) => arr.length <= limits_1.LIMITS.maxPostImage,
            message: `A post can have at most ${limits_1.LIMITS.maxPostImage} media items`,
        },
    },
    likesCount: { type: Number, default: 0 },
    editedAt: { type: Date },
    commentsCount: { type: Number, default: 0 },
}, { timestamps: true });
postSchema.pre("validate", function (next) {
    var _a;
    if (!((_a = this.caption) === null || _a === void 0 ? void 0 : _a.trim()) && this.media.length === 0) {
        this.invalidate("caption", "A post needs a caption or at least one image or video");
    }
    //   next();
});
// Global feed: newest first, with _id as a tie-breaker (needed for cursor pagination on Day 6)
postSchema.index({ createdAt: -1, _id: -1 });
// A user's profile page
postSchema.index({ author: 1, createdAt: -1, _id: -1 });
exports.Post = (0, mongoose_1.model)("Post", postSchema);
