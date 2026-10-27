import { LIMITS } from "../config/limits";
import { Schema,InferSchemaType,model } from "mongoose";
import { NextFunction } from "express";
const mediaSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], required: true },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);



const postSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    caption: { type: String, trim: true, maxlength: LIMITS.captionLength, default: "" },
    media: {
  type: [mediaSchema],
  default: [],
  validate: {
    validator: (arr: unknown[]) => arr.length <= LIMITS.maxPostImage,
    message: `A post can have at most ${LIMITS.maxPostImage} media items`,
  },
},
    likesCount: { type: Number, default: 0 },
    editedAt: { type: Date },
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

postSchema.pre("validate", function (next) {
  if (!this.caption?.trim() && this.media.length === 0) {
    this.invalidate("caption", "A post needs a caption or at least one image or video");
  }
//   next();
});
// Global feed: newest first, with _id as a tie-breaker (needed for cursor pagination on Day 6)
postSchema.index({ createdAt: -1, _id: -1 });
// A user's profile page
postSchema.index({ author: 1, createdAt: -1, _id: -1 });

export type IPost = InferSchemaType<typeof postSchema>;
export const Post = model("Post", postSchema);