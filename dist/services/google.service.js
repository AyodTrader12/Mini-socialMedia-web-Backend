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
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyGoogleToken = verifyGoogleToken;
exports.findOrCreateGoogleUser = findOrCreateGoogleUser;
const google_auth_library_1 = require("google-auth-library");
const env_1 = require("../config/env");
const AppError_1 = require("../config/AppError");
const userModel_1 = require("../model/userModel");
const client = new google_auth_library_1.OAuth2Client(env_1.env.CLIENT_ID_GOOGLE);
function verifyGoogleToken(idToken) {
    return __awaiter(this, void 0, void 0, function* () {
        let payload;
        try {
            const ticket = yield client.verifyIdToken({
                idToken,
                audience: env_1.env.GOOGLE_CLIENT_ID, // token must have been issued for OUR app
            });
            payload = ticket.getPayload();
        }
        catch (_a) {
            throw new AppError_1.AppError(401, "Invalid Google token");
        }
        if (!(payload === null || payload === void 0 ? void 0 : payload.sub) || !payload.email) {
            throw new AppError_1.AppError(401, "Invalid Google token");
        }
        if (!payload.email_verified) {
            throw new AppError_1.AppError(400, "Your Google email address is not verified");
        }
        return {
            googleId: payload.sub,
            email: payload.email.toLowerCase(),
            name: payload.name,
            picture: payload.picture,
        };
    });
}
function usernameBase(profile) {
    const source = profile.name || profile.email.split("@")[0];
    const cleaned = source.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return (cleaned.length >= 3 ? cleaned : "user").slice(0, 15);
}
function createUser(profile) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const base = usernameBase(profile);
        for (let attempt = 0; attempt < 5; attempt++) {
            const suffix = Math.floor(1000 + Math.random() * 9000); // 4 digits
            try {
                return yield userModel_1.user.create({
                    userName: `${base}${suffix}`, // at most 19 characters
                    email: profile.email,
                    fullName: (_a = profile.name) === null || _a === void 0 ? void 0 : _a.slice(0, 50),
                    avatar: profile.picture,
                    isVerified: true,
                    providers: [{ provider: "google", providerId: profile.googleId }],
                });
            }
            catch (err) {
                if (err.code !== 11000)
                    throw err;
                // username collision: try another suffix
            }
        }
        throw new AppError_1.AppError(409, "Could not create account, please try again");
    });
}
function findOrCreateGoogleUser(profile) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Returning Google user
        const byProvider = yield userModel_1.user.findOne({
            providers: { $elemMatch: { provider: "google", providerId: profile.googleId } },
        });
        if (byProvider)
            return { user: byProvider, isNew: false };
        // 2. Same email already registered: link the accounts
        const byEmail = yield userModel_1.user.findOne({ email: profile.email });
        if (byEmail) {
            if (!byEmail.isVerified) {
                // Whoever registered this email never proved they own it. Remove their password,
                // otherwise they could keep logging in to an account that now belongs to the real owner.
                yield userModel_1.user.updateOne({ _id: byEmail._id }, { $unset: { passwordHash: "" } });
            }
            byEmail.providers.push({ provider: "google", providerId: profile.googleId });
            byEmail.isVerified = true;
            if (!byEmail.avatar && profile.picture)
                byEmail.avatar = profile.picture;
            yield byEmail.save();
            return { user: byEmail, isNew: false };
        }
        // 3. Brand new user
        return { user: yield createUser(profile), isNew: true };
    });
}
