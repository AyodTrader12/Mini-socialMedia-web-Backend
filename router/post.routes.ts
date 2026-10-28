import { Router } from "express";
import { createPost, deletePost, editPost } from "../controller/post.controller";
import { validate } from "../middleware/validate";
import { requireVerified } from "../middleware/requireVerified";
import { authenticate } from "../middleware/authenticate";
import { postMediaUpload } from "../middleware/upload";
import { updatePostSchema } from "../validators/post.validator";
import { optionalAuth } from "../middleware/optionalAuth";
import { getFeed,getPostById } from "../controller/post.controller";
import { addBookmark,removeBookmark,getSavedPosts } from "../controller/bookmark.controller";
import { createComment, getComments } from "../controller/comment.controller";
import { createCommentSchema } from "../validators/comment.validator";
import { uploadLimiter } from "../middleware/rateLimiter";
const router = Router()


// post feed
router.get("/get-feed",authenticate,getFeed)

router.get("/saved",authenticate,getSavedPosts)
//get single post by id
router.get("/:id",optionalAuth,getPostById)
//create post
router.post("/create-post", authenticate, requireVerified,uploadLimiter, postMediaUpload, validate(updatePostSchema), createPost);
//bookmarks
router.post("/:id/add-bookmark",authenticate,addBookmark)
router.delete("/:id/delete-bookmark",authenticate,removeBookmark)

//edit and delete post
router.patch("/edit-post/:id",authenticate,requireVerified,validate(updatePostSchema),editPost)
router.delete("/delete-post/:id",authenticate,deletePost)

//comment
router.get("/:id/get-comments",getComments)
router.post("/:id/create-comments",authenticate,requireVerified,validate(createCommentSchema),createComment)
export default router;