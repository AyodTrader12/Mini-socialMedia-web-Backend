import { z } from "zod";

export const userNameRule = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[a-z0-9_]+$/, "Only letters, numbers and underscores allowed");

const emailRule = z.string().trim().toLowerCase().email("Invalid email address");

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

const otpRule = z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits");

export const registerSchema = z.object({
  username: userNameRule,
  email: emailRule,
  password: passwordRule,
});

export const loginSchema = z.object({
  email: emailRule,
  password: passwordRule
});

export const verifyAccountSchema = z.object({ otp: otpRule });

export const forgotPasswordSchema = z.object({ email: emailRule });

export const resetPasswordSchema = z.object({
  email: emailRule,
  otp: otpRule,
  newPassword: passwordRule,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordRule,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });
export const googleLoginSchema = z.object({
  idToken: z.string().min(1, "Google token is required"),
});

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyAccountInput = z.infer<typeof verifyAccountSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;