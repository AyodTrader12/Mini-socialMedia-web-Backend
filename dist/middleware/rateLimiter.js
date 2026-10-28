"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLimiter = exports.otpLimiter = exports.registerLimiter = exports.loginLimiter = exports.apiLimiter = void 0;
const env_1 = require("../config/env");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
function limiter(opts) {
    var _a;
    return (0, express_rate_limit_1.default)({
        windowMs: opts.minutes * 60 * 1000,
        limit: opts.limit,
        standardHeaders: "draft-7", // sends RateLimit headers so the client can see its quota
        legacyHeaders: false,
        skipSuccessfulRequests: (_a = opts.failuresOnly) !== null && _a !== void 0 ? _a : false,
        skip: () => env_1.env.RATE_LIMIT_DISABLED,
        message: { message: opts.message },
    });
}
// Everything under /api and /share
exports.apiLimiter = limiter({
    minutes: 15,
    limit: 600,
    message: "Too many requests, please slow down",
});
// Only FAILED logins count, so a real user who logs in correctly is never blocked
exports.loginLimiter = limiter({
    minutes: 15,
    limit: 10,
    failuresOnly: true,
    message: "Too many failed attempts. Try again in 15 minutes",
});
exports.registerLimiter = limiter({
    minutes: 60,
    limit: 20,
    message: "Too many sign-ups from this network. Try again later",
});
// Verify, resend, forgot and reset: all of these send emails or guess codes
exports.otpLimiter = limiter({
    minutes: 15,
    limit: 10,
    message: "Too many code requests. Try again in 15 minutes",
});
exports.uploadLimiter = limiter({
    minutes: 60,
    limit: 30,
    message: "Upload limit reached. Try again later",
});
