import { Router } from "express"
import { register,login,getMe,changePassword,forgotPassword,resetPassword,resendOtp,verifyAccount } from "../controller/auth.controller"
import { validate } from "../middleware/validate"
import { authenticate } from "../middleware/authenticate"
import { registerSchema,loginSchema,changePasswordSchema,forgotPasswordSchema,resetPasswordSchema,verifyAccountSchema } from "../validators/auth.validator"
import { googleLoginSchema } from "../validators/auth.validator"
import { googleLogin } from "../controller/auth.controller"
import { loginLimiter, otpLimiter, registerLimiter } from "../middleware/rateLimiter"
const router = Router()

router.post("/register", registerLimiter,validate(registerSchema), register);
router.post("/login",loginLimiter, validate(loginSchema), login);
router.get("/me", authenticate, getMe);

router.post("/verify-account", authenticate,otpLimiter, validate(verifyAccountSchema), verifyAccount);
router.post("/resend-otp", authenticate,otpLimiter, resendOtp);

router.post("/forgot-password",otpLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password",otpLimiter, validate(resetPasswordSchema), resetPassword);
router.post("/change-password", authenticate,otpLimiter, validate(changePasswordSchema), changePassword);
router.post("/google",loginLimiter,validate(googleLoginSchema),googleLogin)
export default router;