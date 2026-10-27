"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bookmark = void 0;
const mongoose_1 = require("mongoose");
const bookmarkSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: mongoose_1.Schema.Types.ObjectId, ref: "post", required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
// A user can save a post only once. This also speeds up "which of these posts did I save?"
bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });
// The saved list, newest saved first
bookmarkSchema.index({ user: 1, createdAt: -1, _id: -1 });
exports.Bookmark = (0, mongoose_1.model)("Bookmark", bookmarkSchema);
