import { Router } from "express";
import { getAllUsers,getUserByUsername,removeAvatar,setAvatar,updateProfile } from "../controller/user.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { updateProfileSchema } from "../validators/user.validator";
import { avatarUploads } from "../middleware/upload";
import { getUserPosts } from "../controller/auth.controller";
import { uploadLimiter } from "../middleware/rateLimiter";


const router = Router();

router.get("/", authenticate, getAllUsers);
router.get("/getOneUser/:username", authenticate, getUserByUsername);
router.patch("/profile", authenticate, validate(updateProfileSchema), updateProfile);
router.put("/avatar/uploadAvatar",authenticate,uploadLimiter,avatarUploads,setAvatar)
router.delete("/avatar/deleteAvatar",authenticate,removeAvatar)
router.get("/:username/posts", authenticate, getUserPosts); 




export default router;




