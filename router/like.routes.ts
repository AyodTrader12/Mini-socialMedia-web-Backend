import { Router } from "express";
import { likePost,unlikePost } from "../controller/like.controller";
import { authenticate } from "../middleware/authenticate";
import { requireVerified } from "../middleware/requireVerified";

const router = Router()

router.post("/:id/like-post",authenticate,requireVerified,likePost)
router.delete("/:id/delete-like",authenticate,unlikePost)

export default router