import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { deleteComment } from "../controller/comment.controller";


const router =  Router()

router.delete("/:id/delete-comment",authenticate,deleteComment)

export default router