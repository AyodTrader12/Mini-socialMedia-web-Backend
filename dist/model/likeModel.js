"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Like = void 0;
const mongoose_1 = require("mongoose");
const likeSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "user", unique: true },
    pos: { type: mongoose_1.Schema.Types.ObjectId, ref: "post", unique: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
likeSchema.index({ user: 1, post: 1 }, { unique: true });
likeSchema.index({ post: 1, createdAt: -1 });
exports.Like = (0, mongoose_1.model)("Like", likeSchema);
