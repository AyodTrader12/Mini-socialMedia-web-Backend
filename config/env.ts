import z from "zod";

const envSchema = z.object({
NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN_DAYS: z.coerce.number().default(7),
  EMAIL_FROM: z.string().default("Mini Social <no-reply@minisocial.dev>"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_REFRESH_TOKEN: z.string().min(1, "GOOGLE_REFRESH_TOKEN is required"),
  GOOGLE_ACCESS_TOKEN: z.string().min(1, "GOOGLE_ACCESS_TOKEN is required"),  
  CLOUDINARY_CLOUD_NAME:z.string().min(1,"CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY:z.string().min(1,"CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET:z.string().min(1,"CLOUDINARY_API_SECRET is required"),
  GOOGLE_KEY: z.string().min(16,"GOOGLE_SECRET MUST BE AT EAST 16"),
  CLIENT_ID_GOOGLE: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  RATE_LIMIT_DISABLED: z.string().default("false").transform((v) => v === "true"),
})

export const env = envSchema.parse(process.env)