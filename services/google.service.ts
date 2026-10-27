import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { AppError } from "../config/AppError";
import { user } from "../model/userModel";

const client = new OAuth2Client(env.CLIENT_ID_GOOGLE)


type GoogleProfile = {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
};

export async function verifyGoogleToken(idToken: string): Promise<GoogleProfile> {
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID, // token must have been issued for OUR app
    });
    payload = ticket.getPayload();
  } catch {
    throw new AppError(401, "Invalid Google token");
  }

  if (!payload?.sub || !payload.email) {
    throw new AppError(401, "Invalid Google token");
  }
  if (!payload.email_verified) {
    throw new AppError(400, "Your Google email address is not verified");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name,
    picture: payload.picture,
  };
}

function usernameBase(profile: GoogleProfile) {
  const source = profile.name || profile.email.split("@")[0];
  const cleaned = source.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return (cleaned.length >= 3 ? cleaned : "user").slice(0, 15);
}

async function createUser(profile: GoogleProfile) {
  const base = usernameBase(profile);

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000); // 4 digits
    try {
      return await user.create({
        userName: `${base}${suffix}`, // at most 19 characters
        email: profile.email,
        fullName: profile.name?.slice(0, 50),
        avatar: profile.picture,
        isVerified: true,
        providers: [{ provider: "google", providerId: profile.googleId }],
      });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      // username collision: try another suffix
    }
  }
  throw new AppError(409, "Could not create account, please try again");
}

export async function findOrCreateGoogleUser(profile: GoogleProfile) {
  // 1. Returning Google user
  const byProvider = await user.findOne({
    providers: { $elemMatch: { provider: "google", providerId: profile.googleId } },
  });
  if (byProvider) return { user: byProvider, isNew: false };

  // 2. Same email already registered: link the accounts
  const byEmail = await user.findOne({ email: profile.email });
  if (byEmail) {
    if (!byEmail.isVerified) {
      // Whoever registered this email never proved they own it. Remove their password,
      // otherwise they could keep logging in to an account that now belongs to the real owner.
      await user.updateOne({ _id: byEmail._id }, { $unset: { passwordHash: "" } });
    }
    byEmail.providers.push({ provider: "google", providerId: profile.googleId });
    byEmail.isVerified = true;
    if (!byEmail.avatar && profile.picture) byEmail.avatar = profile.picture;
    await byEmail.save();
    return { user: byEmail, isNew: false };
  }

  // 3. Brand new user
  return { user: await createUser(profile), isNew: true };
}