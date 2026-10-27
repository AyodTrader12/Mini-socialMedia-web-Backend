import z from "zod";
import { LIMITS } from "../config/limits";


export const updatePostSchema = z.object({
  caption: z
    .string()
    .trim()
    .max(LIMITS.captionLength, `Caption must be at most ${LIMITS.captionLength} characters`),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;