import { model,Schema } from "mongoose";


const bookmarkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "post", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A user can save a post only once. This also speeds up "which of these posts did I save?"
bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });
// The saved list, newest saved first
bookmarkSchema.index({ user: 1, createdAt: -1, _id: -1 });

export const Bookmark = model("Bookmark", bookmarkSchema);