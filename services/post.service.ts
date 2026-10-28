import { LIMITS } from "../config/limits";
import { AppError } from "../config/AppError";
import { uploadBuffer,deleteAsset } from "./upload.service";
import { encodeCursor,decodeCursor } from "../utils/cursor";
import { toPost } from "../utils/serializer";
import { Post } from "../model/postModel";
import { user  } from "../model/userModel";
import { Bookmark } from "../model/bookMark";
import {Like } from "../model/likeModel"
import { Comment } from "../model/commentModel";
export type PostMedia = {
  url: string;
  publicId: string;
  type: "image" | "video";
  width?: number;
  height?: number;
};

// export async function uploadPostMedia(files: Express.Multer.File[]): Promise<PostMedia[]> {
//   if (files.length === 0) return [];
//   // ...rest unchanged
// }

const isVideo = (file: Express.Multer.File) => file.mimetype.startsWith("video/");

/** Enforces: at least 1 file, and either all images (each within size) or exactly one video. */
/** A post needs a caption or media. Media, if present, is either all images or exactly one video. */
export function assertValidPost(caption: string | undefined, files: Express.Multer.File[]) {
  if (files.length === 0) {
    if (!caption?.trim()) {
      throw new AppError(400, "Write something or attach an image or video");
    }
    return;
  }

  const hasVideo = files.some(isVideo);

  if (hasVideo) {
    if (files.length > 1) {
      throw new AppError(400, "A post can have one video or up to 10 images, not both");
    }
    return;
  }

  for (const file of files) {
    if (file.size > LIMITS.imageSize) {
      throw new AppError(400, "Each image must be 5MB or smaller");
    }
  }
}
async function uploadOne(file: Express.Multer.File): Promise<PostMedia> {
  const video = isVideo(file);

  const result = await uploadBuffer(file.buffer, {
    folder: "mini-social/posts",
    resource_type: video ? "video" : "image",
    // Cap huge photos at 1600px wide and let Cloudinary pick the quality
    ...(video ? {} : { transformation: [{ width: 1600, crop: "limit", quality: "auto" }] }),
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    type: video ? "video" : "image",
    width: result.width,
    height: result.height,
  };
}

/** Uploads all files in parallel. If any fails, deletes the ones that succeeded and throws. */
export async function uploadPostMedia(files: Express.Multer.File[]): Promise<PostMedia[]> {
    if(files.length === 0) return []
  const results = await Promise.allSettled(files.map(uploadOne));

  const uploaded: PostMedia[] = [];
  let failure: unknown = null;

  for (const result of results) {
    if (result.status === "fulfilled") uploaded.push(result.value);
    else failure ??= result.reason;
  }

  if (failure) {
    await deletePostMedia(uploaded);
    throw failure;
  }

  return uploaded;
}



export async function deletePostMedia(media: Pick<PostMedia, "publicId" | "type">[]) {
  await Promise.allSettled(media.map((m) => deleteAsset(m.publicId, m.type)));
}


type PostDoc = InstanceType<typeof Post>;

/** Of these post IDs, which has the viewer saved? */
async function getBookmarkedIds(viewerId: string | undefined, postIds: unknown[]) {
  if (!viewerId || postIds.length === 0) return new Set<string>();

  const rows = await Bookmark.find({ user: viewerId, post: { $in: postIds } }).select("post");
return new Set(rows.map((r) => r.post.toString()));
}

async function getLikedIds(viewerId: string | undefined, postIds: unknown[]) {
  if (!viewerId || postIds.length === 0) return new Set<string>();

  const rows = await Like.find({ user: viewerId, post: { $in: postIds } }).select("post");
  return new Set(rows.map((r) => r.post.toString()));
}

/** Turns post documents into API objects: loads authors and viewer flags in bulk. */
export async function serializePosts(docs: PostDoc[], viewerId?: string) {
  if (docs.length === 0) return [];

  const authorIds = [...new Set(docs.map((p) => p.author.toString()))];
  const postIds = docs.map((p) => p._id);

  const [authors, bookmarked, liked] = await Promise.all([
    user.find({ _id: { $in: authorIds } }),
    getBookmarkedIds(viewerId, postIds),
    getLikedIds(viewerId, postIds),
  ]);

  const authorMap = new Map(authors.map((a) => [a.id, a]));

  return docs.flatMap((post) => {
    const author = authorMap.get(post.author.toString());
    if (!author) return [];

    return [
      toPost(post, author, {
        liked: liked.has(post.id),
        bookmarked: bookmarked.has(post.id),
      }),
    ];
  });
}

export async function getPostsPage(opts: {
  filter?: Record<string, unknown>;
  cursor?: unknown;
  limit?: unknown;
  viewerId?: string;
}) {
  const limit = Math.min(30, Math.max(1, Number(opts.limit) || 10));
  const filter: Record<string, unknown> = { ...opts.filter };

  const cursor = decodeCursor(opts.cursor);
  if (cursor) {
    filter.$or = [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
    ];
  }

  const docs = await Post.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;

  return {
    posts: await serializePosts(page, opts.viewerId),
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
  };
}

export async function getSavedPostsPage(opts: {
  viewerId: string;
  cursor?: unknown;
  limit?: unknown;
}) {
  const limit = Math.min(30, Math.max(1, Number(opts.limit) || 10));
  const filter: Record<string, unknown> = { user: opts.viewerId };

  // The cursor here points at a Bookmark (when you saved it), not at a Post
  const cursor = decodeCursor(opts.cursor);
  if (cursor) {
    filter.$or = [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
    ];
  }

  const rows = await Bookmark.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const posts = await Post.find({ _id: { $in: page.map((r) => r.post) } });
  const postMap = new Map(posts.map((p) => [p.id, p]));

  // Keep the order you saved them in, and skip posts that no longer exist
  const ordered = page.flatMap((row) => {
    const post = postMap.get(row.post.toString());
    return post ? [post] : [];
  });

  return {
    posts: await serializePosts(ordered, opts.viewerId),
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
  };
}


/** Deletes posts and everything attached to them. */
export async function removePosts(posts: PostDoc[]) {
  if (posts.length === 0) return;

  const ids = posts.map((p) => p._id);

  await Post.deleteMany({ _id: { $in: ids } });
  await Bookmark.deleteMany({ post: { $in: ids } });
  await Like.deleteMany({ post: { $in: ids } });
  await Comment.deleteMany({ post: { $in: ids } });
  // Cloudinary cleanup is best effort and doesn't block the response.
  // deletePostMedia uses allSettled, so it never throws.
  const media = posts.flatMap((p) => p.media.map((m) => ({ publicId: m.publicId, type: m.type })));
  void deletePostMedia(media);
}