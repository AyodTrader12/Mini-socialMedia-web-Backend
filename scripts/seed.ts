import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { env } from "../config/env";
import { connectDB } from "../config/dataBase";
import { user } from "../model/userModel";
import { Post } from "../model/postModel";
import { Like } from "../model/likeModel";
import { Comment } from "../model/commentModel";
import { Bookmark } from "../model/bookMark";

const USER_COUNT = 20;
const POST_COUNT = 100;
const SEED_EMAIL = /^seed\d+@example\.com$/;

const FIRST = ["Ada", "Bola", "Chidi", "Dayo", "Efe", "Femi", "Gina", "Hauwa", "Ife", "Jide"];
const LAST = ["Okafor", "Bello", "Adeyemi", "Eze", "Musa", "Nwosu", "Balogun", "Ibrahim"];
const CAPTIONS = [
  "Golden hour hits different today",
  "Weekend plans: absolutely nothing",
  "Finally finished the project!",
  "Coffee first, then everything else",
  "Who else is up this early?",
  "Small wins matter",
  "Trying something new this week",
  "Lagos traffic stories, part 47",
  "Sunday reset",
  "Good food, good people",
];
const COMMENTS = ["Love this!", "So true", "Great shot", "Haha same", "Congrats!", "Needs to be shared more", "Beautiful"];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]) => arr[rand(0, arr.length - 1)];
const sample = <T>(arr: T[], n: number) =>
  [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));

async function main() {
  if (env.NODE_ENV === "production") {
    console.error("Refusing to seed in production");
    process.exit(1);
  }

  await connectDB();

  // Clear a previous seed. Seed likes and comments only target seed posts,
  // so no real post's counters are affected.
  const old = await user.find({ email: SEED_EMAIL }).select("_id");
  if (old.length > 0) {
    const oldIds = old.map((u) => u._id);
    const oldPosts = await Post.find({ author: { $in: oldIds } }).select("_id");
    const postIds = oldPosts.map((p) => p._id);
    await Promise.all([
      Like.deleteMany({ $or: [{ user: { $in: oldIds } }, { post: { $in: postIds } }] }),
      Comment.deleteMany({ $or: [{ author: { $in: oldIds } }, { post: { $in: postIds } }] }),
      Bookmark.deleteMany({ $or: [{ user: { $in: oldIds } }, { post: { $in: postIds } }] }),
    ]);
    await Post.deleteMany({ author: { $in: oldIds } });
    await user.deleteMany({ _id: { $in: oldIds } });
    console.log("Cleared previous seed data");
  }

  const passwordHash = await bcrypt.hash("password123", 10); // one hash for all seed users

  const users = await user.insertMany(
    Array.from({ length: USER_COUNT }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      return {
        username: `demo_user_${n}`,
        email: `seed${i + 1}@example.com`,
        passwordHash,
        fullName: `${pick(FIRST)} ${pick(LAST)}`,
        bio: "Seeded demo account",
        avatar: `https://i.pravatar.cc/200?img=${i + 1}`,
        isVerified: true,
      };
    })
  );

  const now = Date.now();
  const posts = Array.from({ length: POST_COUNT }, (_, i) => {
    const imageCount = Math.random() < 0.6 ? rand(1, 4) : 0; // 40% text-only
    const createdAt = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);
    return {
      _id: new mongoose.Types.ObjectId(),
      author: pick(users)._id,
      caption: `${pick(CAPTIONS)} #${i + 1}`,
      media: Array.from({ length: imageCount }, (_, j) => ({
        url: `https://picsum.photos/seed/${i}-${j}/800/600`,
        publicId: `seed/${i}-${j}`,
        type: "image" as const,
        width: 800,
        height: 600,
      })),
      likesCount: 0,
      commentsCount: 0,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const likes: { user: unknown; post: unknown; createdAt: Date }[] = [];
  const comments: { post: unknown; author: unknown; text: string; createdAt: Date }[] = [];
  const bookmarks: { user: unknown; post: unknown; createdAt: Date }[] = [];

  for (const post of posts) {
    const likers = sample(users, rand(0, 12));
    for (const u of likers) likes.push({ user: u._id, post: post._id, createdAt: post.createdAt });
    post.likesCount = likers.length;

    const commentCount = rand(0, 5);
    for (let c = 0; c < commentCount; c++) {
      comments.push({ post: post._id, author: pick(users)._id, text: pick(COMMENTS), createdAt: post.createdAt });
    }
    post.commentsCount = commentCount;

    for (const u of sample(users, rand(0, 3))) {
      bookmarks.push({ user: u._id, post: post._id, createdAt: post.createdAt });
    }
  }

  await Post.insertMany(posts);
  await Like.insertMany(likes);
  await Comment.insertMany(comments);
  await Bookmark.insertMany(bookmarks);

  console.log(`Seeded ${users.length} users, ${posts.length} posts, ${likes.length} likes, ${comments.length} comments`);
  console.log("Log in with seed1@example.com ... seed20@example.com, password: password123");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});