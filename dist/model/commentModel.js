"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Comment = exports.commentSchema = void 0;
const mongoose_1 = require("mongoose");
const limits_1 = require("../config/limits");
exports.commentSchema = new mongoose_1.Schema({
    post: { type: mongoose_1.Schema.Types.ObjectId, ref: "post", required: true },
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: "user", required: true },
    text: { type: String, required: true, trim: true, maxLength: limits_1.LIMITS.commentLength }
}, { timestamps: { createdAt: true, updatedAt: false } });
exports.commentSchema.index({ post: 1, createdAt: -1, id: -1 });
exports.commentSchema.index({ author: 1 });
exports.Comment = (0, mongoose_1.model)("Comment", exports.commentSchema);
