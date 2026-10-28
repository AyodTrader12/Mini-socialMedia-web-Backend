"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../config/env");
const dataBase_1 = require("../config/dataBase");
const userModel_1 = require("../model/userModel");
const postModel_1 = require("../model/postModel");
const likeModel_1 = require("../model/likeModel");
const commentModel_1 = require("../model/commentModel");
const bookMark_1 = require("../model/bookMark");
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
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const sample = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        if (env_1.env.NODE_ENV === "production") {
            console.error("Refusing to seed in production");
            process.exit(1);
        }
        yield (0, dataBase_1.connectDB)();
        // Clear a previous seed. Seed likes and comments only target seed posts,
        // so no real post's counters are affected.
        const old = yield userModel_1.user.find({ email: SEED_EMAIL }).select("_id");
        if (old.length > 0) {
            const oldIds = old.map((u) => u._id);
            const oldPosts = yield postModel_1.Post.find({ author: { $in: oldIds } }).select("_id");
            const postIds = oldPosts.map((p) => p._id);
            yield Promise.all([
                likeModel_1.Like.deleteMany({ $or: [{ user: { $in: oldIds } }, { post: { $in: postIds } }] }),
                commentModel_1.Comment.deleteMany({ $or: [{ author: { $in: oldIds } }, { post: { $in: postIds } }] }),
                bookMark_1.Bookmark.deleteMany({ $or: [{ user: { $in: oldIds } }, { post: { $in: postIds } }] }),
            ]);
            yield postModel_1.Post.deleteMany({ author: { $in: oldIds } });
            yield userModel_1.user.deleteMany({ _id: { $in: oldIds } });
            console.log("Cleared previous seed data");
        }
        const passwordHash = yield bcrypt_1.default.hash("password123", 10); // one hash for all seed users
        const users = yield userModel_1.user.insertMany(Array.from({ length: USER_COUNT }, (_, i) => {
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
        }));
        const now = Date.now();
        const posts = Array.from({ length: POST_COUNT }, (_, i) => {
            const imageCount = Math.random() < 0.6 ? rand(1, 4) : 0; // 40% text-only
            const createdAt = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);
            return {
                _id: new mongoose_1.default.Types.ObjectId(),
                author: pick(users)._id,
                caption: `${pick(CAPTIONS)} #${i + 1}`,
                media: Array.from({ length: imageCount }, (_, j) => ({
                    url: `https://picsum.photos/seed/${i}-${j}/800/600`,
                    publicId: `seed/${i}-${j}`,
                    type: "image",
                    width: 800,
                    height: 600,
                })),
                likesCount: 0,
                commentsCount: 0,
                createdAt,
                updatedAt: createdAt,
            };
        });
        const likes = [];
        const comments = [];
        const bookmarks = [];
        for (const post of posts) {
            const likers = sample(users, rand(0, 12));
            for (const u of likers)
                likes.push({ user: u._id, post: post._id, createdAt: post.createdAt });
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
        yield postModel_1.Post.insertMany(posts);
        yield likeModel_1.Like.insertMany(likes);
        yield commentModel_1.Comment.insertMany(comments);
        yield bookMark_1.Bookmark.insertMany(bookmarks);
        console.log(`Seeded ${users.length} users, ${posts.length} posts, ${likes.length} likes, ${comments.length} comments`);
        console.log("Log in with seed1@example.com ... seed20@example.com, password: password123");
        yield mongoose_1.default.disconnect();
    });
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
