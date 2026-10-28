import { env } from "../config/env";
import rateLimit from "express-rate-limit";

function limiter(opts: {
  minutes: number;
  limit: number;
  message: string;
  failuresOnly?: boolean;
}) {
  return rateLimit({
    windowMs: opts.minutes * 60 * 1000,
    limit: opts.limit,
    standardHeaders: "draft-7", // sends RateLimit headers so the client can see its quota
    legacyHeaders: false,
    skipSuccessfulRequests: opts.failuresOnly ?? false,
    skip: () => env.RATE_LIMIT_DISABLED,
    message: { message: opts.message },
  });
}

// Everything under /api and /share
export const apiLimiter = limiter({
  minutes: 15,
  limit: 600,
  message: "Too many requests, please slow down",
});

// Only FAILED logins count, so a real user who logs in correctly is never blocked
export const loginLimiter = limiter({
  minutes: 15,
  limit: 10,
  failuresOnly: true,
  message: "Too many failed attempts. Try again in 15 minutes",
});

export const registerLimiter = limiter({
  minutes: 60,
  limit: 20,
  message: "Too many sign-ups from this network. Try again later",
});

// Verify, resend, forgot and reset: all of these send emails or guess codes
export const otpLimiter = limiter({
  minutes: 15,
  limit: 10,
  message: "Too many code requests. Try again in 15 minutes",
});

export const uploadLimiter = limiter({
  minutes: 60,
  limit: 30,
  message: "Upload limit reached. Try again later",
});