"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleLoginSchema = exports.changePasswordSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.verifyAccountSchema = exports.loginSchema = exports.registerSchema = exports.userNameRule = void 0;
const zod_1 = require("zod");
exports.userNameRule = zod_1.z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_]+$/, "Only letters, numbers and underscores allowed");
const emailRule = zod_1.z.string().trim().toLowerCase().email("Invalid email address");
const passwordRule = zod_1.z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters");
const otpRule = zod_1.z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits");
exports.registerSchema = zod_1.z.object({
    username: exports.userNameRule,
    email: emailRule,
    password: passwordRule,
});
exports.loginSchema = zod_1.z.object({
    email: emailRule,
    password: passwordRule
});
exports.verifyAccountSchema = zod_1.z.object({ otp: otpRule });
exports.forgotPasswordSchema = zod_1.z.object({ email: emailRule });
exports.resetPasswordSchema = zod_1.z.object({
    email: emailRule,
    otp: otpRule,
    newPassword: passwordRule,
});
exports.changePasswordSchema = zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(1, "Current password is required"),
    newPassword: passwordRule,
})
    .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
});
exports.googleLoginSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(1, "Google token is required"),
});
