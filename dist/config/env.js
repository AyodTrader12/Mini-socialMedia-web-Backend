"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = __importDefault(require("zod"));
const envSchema = zod_1.default.object({
    NODE_ENV: zod_1.default.enum(["development", "production", "test"]).default("development"),
    PORT: zod_1.default.coerce.number().default(5000),
    MONGO_URI: zod_1.default.string().min(1, "MONGO_URI is required"),
    CLIENT_URL: zod_1.default.string().default("http://localhost:5173"),
    JWT_SECRET: zod_1.default.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN_DAYS: zod_1.default.coerce.number().default(7),
    EMAIL_FROM: zod_1.default.string().default("Mini Social <no-reply@minisocial.dev>"),
    GOOGLE_CLIENT_ID: zod_1.default.string().min(1, "GOOGLE_CLIENT_ID is required"),
    GOOGLE_CLIENT_SECRET: zod_1.default.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
    GOOGLE_REFRESH_TOKEN: zod_1.default.string().min(1, "GOOGLE_REFRESH_TOKEN is required"),
    GOOGLE_ACCESS_TOKEN: zod_1.default.string().min(1, "GOOGLE_ACCESS_TOKEN is required"),
    CLOUDINARY_CLOUD_NAME: zod_1.default.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
    CLOUDINARY_API_KEY: zod_1.default.string().min(1, "CLOUDINARY_API_KEY is required"),
    CLOUDINARY_API_SECRET: zod_1.default.string().min(1, "CLOUDINARY_API_SECRET is required"),
    GOOGLE_KEY: zod_1.default.string().min(16, "GOOGLE_SECRET MUST BE AT EAST 16"),
    CLIENT_ID_GOOGLE: zod_1.default.string().min(1, "GOOGLE_CLIENT_ID is required"),
});
exports.env = envSchema.parse(process.env);
