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
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dataBase_1 = require("./config/dataBase");
const errorHandler_1 = require("./middleware/errorHandler");
const user_routes_1 = __importDefault(require("./router/user.routes"));
const auth_routes_1 = __importDefault(require("./router/auth.routes"));
const admin_routes_1 = __importDefault(require("./router/admin.routes"));
const post_routes_1 = __importDefault(require("./router/post.routes"));
const share_routes_1 = __importDefault(require("./router/share.routes"));
const like_routes_1 = __importDefault(require("./router/like.routes"));
const comment_routes_1 = __importDefault(require("./router/comment.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use("/api/users", user_routes_1.default);
app.use("/api/auth", auth_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/post", post_routes_1.default);
app.use("/api/share", share_routes_1.default);
app.use("/api/like", like_routes_1.default);
app.use("/api/comments", comment_routes_1.default);
app.use(errorHandler_1.errorHandler);
app.get("/health", (req, res) => {
    res.status(200).json({ message: "Server is running fine" });
});
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, dataBase_1.connectDB)();
        app.listen(PORT, () => {
            console.clear();
            console.log(`Server is running on port ${PORT}`);
        });
    });
}
startServer().catch((error) => {
    console.error("Error starting the server:", error);
    process.exit(1);
});
