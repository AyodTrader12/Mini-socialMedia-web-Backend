import { Request,Response } from "express";
import mongoose from "mongoose"
import { Post } from "../model/postModel";
import { user } from "../model/userModel";
import { Like } from "../model/likeModel";
import { AppError } from "../config/AppError";
import { CreateCommentInput } from "../validators/comment.validator";
import { toComment } from "../utils/serializer";
import { encodeCursor,decodeCursor } from "../utils/cursor";

function parseId(raw: unknown, notFoundMessage: string) {
  const id = String(raw);
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, notFoundMessage);
  return id;
}

export async function getComments(req: Request, res: Response) {
  const postId = parseId(req.params.id, "Post not found");

  if (!(await Post.exists({ _id: postId }))) throw new AppError(404, "Post not found");

  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const filter: Record<string, unknown> = { post: postId };

  const cursor = decodeCursor(req.query.cursor);
  if (cursor) {
    filter.$or = [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
    ];
  }

  const docs = await Comment.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;

  // One query for all authors
  const authorIds = [...new Set(page.map((c:any) => c.author.toString()))];
  const authors = await user.find({ _id: { $in: authorIds } });
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const comments = page.flatMap((c:any) => {
    const author = authorMap.get(c.author.toString());
    return author ? [toComment(c, author)] : [];
  });

  res.json({
    comments,
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
  });
}

export async function createComment(req: Request, res: Response) {
  const { text } = req.body as CreateCommentInput;
  const postId = parseId(req.params.id, "Post not found");

  if (!(await Post.exists({ _id: postId }))) throw new AppError(404, "Post not found");

  const author = await user.findById(req.userId);
  if (!author) throw new AppError(404, "User not found");

  const comment = await Comment.create({ post: postId, author: author._id, text });

  const post = await Post.findByIdAndUpdate(
    postId,
    { $inc: { commentsCount: 1 } },
    { new: true }
  );

  if (!post) {
    // Post was deleted between our check and now
    await comment.deleteOne();
    throw new AppError(404, "Post not found");
  }

  res.status(201).json({
    comment: toComment(comment, author),
    commentsCount: post.commentsCount,
  });
}

export async function deleteComment(req: Request, res: Response) {
  const commentId = parseId(req.params.id, "Comment not found");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new AppError(404, "Comment not found");

  const post = await Post.findById(comment.post).select("author commentsCount");

  const isCommentAuthor = comment.author.toString() === req.userId;
  const isPostAuthor = post?.author.toString() === req.userId;
  if (!isCommentAuthor && !isPostAuthor && req.userRole !== "admin") {
    throw new AppError(403, "You can't delete this comment");
  }

  const result = await Comment.deleteOne({ _id: comment._id });

  // Only decrement if we really removed it, and never go below zero
  let commentsCount = post?.commentsCount ?? 0;
  if (result.deletedCount && post) {
    const updated = await Post.findOneAndUpdate(
      { _id: post._id, commentsCount: { $gt: 0 } },
      { $inc: { commentsCount: -1 } },
      { new: true }
    );
    commentsCount = updated?.commentsCount ?? 0;
  }

  res.json({ message: "Comment deleted", commentsCount });
}