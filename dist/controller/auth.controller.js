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
exports.register = register;
exports.login = login;
exports.getMe = getMe;
exports.verifyAccount = verifyAccount;
exports.resendOtp = resendOtp;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.changePassword = changePassword;
exports.getUserPosts = getUserPosts;
exports.googleLogin = googleLogin;
const AppError_1 = require("../config/AppError");
const userModel_1 = require("../model/userModel");
const jwt_1 = require("../utils/jwt");
const serializer_1 = require("../utils/serializer");
const bcrypt_1 = __importDefault(require("bcrypt"));
const otp_service_1 = require("../services/otp.service");
const post_service_1 = require("../services/post.service");
const google_service_1 = require("../services/google.service");
const DUMMY_HASH = bcrypt_1.default.hashSync("dummy-password", 12);
function register(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { username, email, password } = req.body;
        const existing = yield userModel_1.user.findOne({ $or: [{ email }, { userName: username }] });
        if (existing) {
            const message = existing.email === email ? "Email already in use" : "Username already taken";
            throw new AppError_1.AppError(409, message);
        }
        const passwordHash = yield bcrypt_1.default.hash(password, 12);
        const newUser = yield userModel_1.user.create({ userName: username, email, passwordHash });
        // Don't make the user wait for the email. If it fails, they can use "resend".
        (0, otp_service_1.sendOtp)(newUser, "verify").catch((err) => console.error("Failed to send OTP:", err));
        res.status(201).json({
            user: (0, serializer_1.toPublicUser)(newUser),
            token: (0, jwt_1.signToken)(newUser.id),
        });
    });
}
function login(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { email, password } = req.body;
        const loginUser = yield userModel_1.user.findOne({ email }).select("+passwordHash");
        const hashToCheck = (_a = loginUser === null || loginUser === void 0 ? void 0 : loginUser.passwordHash) !== null && _a !== void 0 ? _a : DUMMY_HASH;
        const passwordMatches = yield bcrypt_1.default.compare(password, hashToCheck);
        if (!loginUser || !loginUser.passwordHash || !passwordMatches) {
            throw new AppError_1.AppError(401, "Invalid email or password");
        }
        if (loginUser.isSuspended) {
            throw new AppError_1.AppError(403, "This account has been suspended");
        }
        res.json({
            user: (0, serializer_1.toPublicUser)(loginUser),
            token: (0, jwt_1.signToken)(loginUser.id),
        });
    });
}
function getMe(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const getUser = yield userModel_1.user.findById(req.userId);
        if (!getUser) {
            throw new AppError_1.AppError(404, "User not found");
        }
        res.json({ user: (0, serializer_1.toPublicUser)(getUser) });
    });
}
function verifyAccount(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { otp } = req.body;
        const verifyUser = yield userModel_1.user.findById(req.userId);
        if (!verifyUser)
            throw new AppError_1.AppError(404, "User not found");
        if (verifyUser.isVerified)
            throw new AppError_1.AppError(400, "Account is already verified");
        yield (0, otp_service_1.verifyOtp)(verifyUser.id, "verify", otp);
        verifyUser.isVerified = true;
        yield verifyUser.save();
        res.json({ user: (0, serializer_1.toPublicUser)(verifyUser) });
    });
}
function resendOtp(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const resendOtpUser = yield userModel_1.user.findById(req.userId);
        if (!resendOtpUser)
            throw new AppError_1.AppError(404, "User not found");
        if (resendOtpUser.isVerified)
            throw new AppError_1.AppError(400, "Account is already verified");
        // if(resendOtpUser.isVerified === false) throw new AppError(400,"account not verified request for otp")
        const sent = yield (0, otp_service_1.sendOtp)(resendOtpUser, "verify");
        if (!sent) {
            throw new AppError_1.AppError(429, "Please wait a minute before requesting another code");
        }
        res.json({ message: "Verification code sent" });
    });
}
function forgotPassword(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { email } = req.body;
        const forgotPasswordUser = yield userModel_1.user.findOne({ email });
        if (forgotPasswordUser) {
            // Not awaited, so response time doesn't reveal whether the email exists
            (0, otp_service_1.sendOtp)(forgotPasswordUser, "reset").catch((err) => console.error("Failed to send OTP:", err));
        }
        // Same response either way
        res.json({ message: "If that email is registered, a reset code has been sent" });
    });
}
function resetPassword(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { email, otp, newPassword } = req.body;
        const resetPasswordUser = yield userModel_1.user.findOne({ email });
        if (!resetPasswordUser)
            throw new AppError_1.AppError(400, "Invalid or expired code");
        yield (0, otp_service_1.verifyOtp)(resetPasswordUser.id, "reset", otp);
        resetPasswordUser.passwordHash = yield bcrypt_1.default.hash(newPassword, 12);
        resetPasswordUser.isVerified = true; // they just proved they own this inbox
        yield resetPasswordUser.save();
        res.json({ message: "Password reset successful. You can now log in." });
    });
}
function changePassword(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { currentPassword, newPassword } = req.body;
        const changePasswordUser = yield userModel_1.user.findById(req.userId).select("+passwordHash");
        if (!changePasswordUser)
            throw new AppError_1.AppError(404, "User not found");
        if (!changePasswordUser.passwordHash) {
            throw new AppError_1.AppError(400, "This account has no password yet. Use 'Forgot password' to set one.");
        }
        const matches = yield bcrypt_1.default.compare(currentPassword, changePasswordUser.passwordHash);
        if (!matches) {
            // 400, not 401: a 401 would make the frontend think the login session expired
            throw new AppError_1.AppError(400, "Current password is incorrect");
        }
        changePasswordUser.passwordHash = yield bcrypt_1.default.hash(newPassword, 12);
        yield changePasswordUser.save();
        res.json({ message: "Password changed successfully" });
    });
}
function getUserPosts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const username = String(req.params.username).toLowerCase();
        const foundUser = yield userModel_1.user.findOne({ username });
        if (!foundUser)
            throw new AppError_1.AppError(404, "User not found");
        const result = yield (0, post_service_1.getPostsPage)({
            filter: { author: foundUser._id },
            cursor: req.query.cursor,
            limit: req.query.limit,
            viewerId: req.userId,
        });
        res.json(result);
    });
}
function googleLogin(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { idToken } = req.body;
        const profile = yield (0, google_service_1.verifyGoogleToken)(idToken);
        const { user, isNew } = yield (0, google_service_1.findOrCreateGoogleUser)(profile);
        if (user.isSuspended) {
            throw new AppError_1.AppError(403, "This account has been suspended");
        }
        res.status(isNew ? 201 : 200).json({
            user: (0, serializer_1.toPublicUser)(user),
            token: (0, jwt_1.signToken)(user.id),
        });
    });
}
