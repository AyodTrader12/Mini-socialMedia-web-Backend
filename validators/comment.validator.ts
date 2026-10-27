import { z } from "zod";
import { LIMITS } from "../config/limits";

export const createCommentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Comment can't be empty")
    .max(LIMITS.commentLength, `Comment must be at most ${LIMITS.commentLength} characters`),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;