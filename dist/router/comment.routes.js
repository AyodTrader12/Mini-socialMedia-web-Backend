"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const comment_controller_1 = require("../controller/comment.controller");
const router = (0, express_1.Router)();
router.delete("/:id/delete-comment", authenticate_1.authenticate, comment_controller_1.deleteComment);
exports.default = router;
