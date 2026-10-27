"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("../controller/post.controller");
const validate_1 = require("../middleware/validate");
const requireVerified_1 = require("../middleware/requireVerified");
const authenticate_1 = require("../middleware/authenticate");
const upload_1 = require("../middleware/upload");
const post_validator_1 = require("../validators/post.validator");
const optionalAuth_1 = require("../middleware/optionalAuth");
const post_controller_2 = require("../controller/post.controller");
const bookmark_controller_1 = require("../controller/bookmark.controller");
const comment_controller_1 = require("../controller/comment.controller");
const comment_validator_1 = require("../validators/comment.validator");
const router = (0, express_1.Router)();
// post feed
router.get("/get-feed", authenticate_1.authenticate, post_controller_2.getFeed);
router.get("/saved", authenticate_1.authenticate, bookmark_controller_1.getSavedPosts);
//get single post by id
router.get("/:id", optionalAuth_1.optionalAuth, post_controller_2.getPostById);
//create post
router.post("/create-post", authenticate_1.authenticate, requireVerified_1.requireVerified, upload_1.postMediaUpload, (0, validate_1.validate)(post_validator_1.updatePostSchema), post_controller_1.createPost);
//bookmarks
router.post("/:id/add-bookmark", authenticate_1.authenticate, bookmark_controller_1.addBookmark);
router.delete("/:id/delete-bookmark", authenticate_1.authenticate, bookmark_controller_1.removeBookmark);
//edit and delete post
router.patch("/edit-post/:id", authenticate_1.authenticate, requireVerified_1.requireVerified, (0, validate_1.validate)(post_validator_1.updatePostSchema), post_controller_1.editPost);
router.delete("/delete-post/:id", authenticate_1.authenticate, post_controller_1.deletePost);
//comment
router.get("/:id/get-comments", comment_controller_1.getComments);
router.post("/:id/create-comments", authenticate_1.authenticate, requireVerified_1.requireVerified, (0, validate_1.validate)(comment_validator_1.createCommentSchema), comment_controller_1.createComment);
exports.default = router;
