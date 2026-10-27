import { Request,Response } from "express";
import { AppError } from "../config/AppError";
import { user } from "../model/userModel";
import { signToken } from "../utils/jwt";
import { toPublicProfile, toPublicUser } from "../utils/serializer";
import bcrypt from "bcrypt";
import { sendOtp, verifyOtp } from "../services/otp.service";
import { RegisterInput,LoginInput,ResetPasswordInput,VerifyAccountInput,ChangePasswordInput,ForgotPasswordInput } from "../validators/auth.validator";
import { getPostsPage } from "../services/post.service";



const DUMMY_HASH = bcrypt.hashSync("dummy-password", 12);

export async function register(req: Request, res: Response) {
  const { username, email, password } = req.body as RegisterInput;

  const existing = await user.findOne({ $or: [{ email }, {userName: username }] });
  if (existing) {
    const message =
      existing.email === email ? "Email already in use" : "Username already taken";
    throw new AppError(409, message);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser:any = await user.create({ userName:username, email, passwordHash });

  // Don't make the user wait for the email. If it fails, they can use "resend".
  sendOtp(newUser, "verify").catch((err) => console.error("Failed to send OTP:", err));

  res.status(201).json({
    user: toPublicUser(newUser),
    token: signToken(newUser.id),
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput;

  const loginUser = await user.findOne({ email }).select("+passwordHash");

  const hashToCheck = loginUser?.passwordHash ?? DUMMY_HASH;
  const passwordMatches = await bcrypt.compare(password, hashToCheck);

  if (!loginUser || !loginUser.passwordHash || !passwordMatches) {
    throw new AppError(401, "Invalid email or password");
  }

   if (loginUser.isSuspended) {
    throw new AppError(403, "This account has been suspended");
  }

  res.json({
    user: toPublicUser(loginUser),
    token: signToken(loginUser.id),
  });
}

export async function getMe(req: Request, res: Response) {
  const getUser = await user.findById(req.userId);
  if (!getUser) {
    throw new AppError(404, "User not found");
  }
  res.json({ user: toPublicUser(getUser) });
}

export async function verifyAccount(req: Request, res: Response) {
  const { otp } = req.body as VerifyAccountInput;

  const verifyUser = await user.findById(req.userId);
  if (!verifyUser) throw new AppError(404, "User not found");
  if (verifyUser.isVerified) throw new AppError(400, "Account is already verified");

  await verifyOtp(verifyUser.id, "verify", otp);

  verifyUser.isVerified = true;
  await verifyUser.save();

  res.json({ user: toPublicUser(verifyUser) });
}

export async function resendOtp(req: Request, res: Response) {
  const resendOtpUser = await user.findById(req.userId);
  if (!resendOtpUser) throw new AppError(404, "User not found");
  if (resendOtpUser.isVerified) throw new AppError(400, "Account is already verified");
  // if(resendOtpUser.isVerified === false) throw new AppError(400,"account not verified request for otp")

  const sent = await sendOtp(resendOtpUser, "verify");
  if (!sent) {
    throw new AppError(429, "Please wait a minute before requesting another code");
  }

  res.json({ message: "Verification code sent" });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as ForgotPasswordInput;

  const forgotPasswordUser = await user.findOne({ email });
  if (forgotPasswordUser) {
    // Not awaited, so response time doesn't reveal whether the email exists
    sendOtp(forgotPasswordUser, "reset").catch((err) => console.error("Failed to send OTP:", err));
  }

  // Same response either way
  res.json({ message: "If that email is registered, a reset code has been sent" });
}

export async function resetPassword(req: Request, res: Response) {
  const { email, otp, newPassword } = req.body as ResetPasswordInput;

  const resetPasswordUser = await user.findOne({ email });
  if (!resetPasswordUser) throw new AppError(400, "Invalid or expired code");

  await verifyOtp(resetPasswordUser.id, "reset", otp);

  resetPasswordUser.passwordHash = await bcrypt.hash(newPassword, 12);
  resetPasswordUser.isVerified = true; // they just proved they own this inbox
  await resetPasswordUser.save();

  res.json({ message: "Password reset successful. You can now log in." });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  const changePasswordUser = await user.findById(req.userId).select("+passwordHash");
  if (!changePasswordUser) throw new AppError(404, "User not found");

  if (!changePasswordUser.passwordHash) {
    throw new AppError(400, "This account has no password yet. Use 'Forgot password' to set one.");
  }
  
  const matches = await bcrypt.compare(currentPassword, changePasswordUser.passwordHash);
  if (!matches) {
    // 400, not 401: a 401 would make the frontend think the login session expired
    throw new AppError(400, "Current password is incorrect");
  }

  changePasswordUser.passwordHash = await bcrypt.hash(newPassword, 12);
  await changePasswordUser.save();

  res.json({ message: "Password changed successfully" });
}

export async function getUserPosts(req: Request, res: Response) {
  const username = String(req.params.username).toLowerCase();

  const User = await user.findOne({ username });
  if (!user) throw new AppError(404, "User not found");

  const result = await getPostsPage({
    filter: { author: user._id },
    cursor: req.query.cursor,
    limit: req.query.limit,
    viewerId: req.userId,
  });
  res.json(result);
}