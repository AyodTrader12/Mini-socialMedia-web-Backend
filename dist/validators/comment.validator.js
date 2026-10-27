"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommentSchema = void 0;
const zod_1 = require("zod");
const limits_1 = require("../config/limits");
exports.createCommentSchema = zod_1.z.object({
    text: zod_1.z
        .string()
        .trim()
        .min(1, "Comment can't be empty")
        .max(limits_1.LIMITS.commentLength, `Comment must be at most ${limits_1.LIMITS.commentLength} characters`),
});
