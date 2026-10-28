import env from "dotenv";
import express, { Application } from "express";
import cors from "cors";
import { Request,Response } from "express";
import helmet from "helmet";
import { connectDB } from "./config/dataBase";
import { errorHandler } from "./middleware/errorHandler";
import userRoutes from "./router/user.routes";
import authRoutes from "./router/auth.routes";
import adminRoutes from "./router/admin.routes"
import postRoutes from "./router/post.routes"
import shareRoutes from "./router/share.routes"
import likeRoutes from "./router/like.routes"
import commentRoutes from "./router/comment.routes"
import { apiLimiter } from "./middleware/rateLimiter";
env.config()

const app:Application = express();
app.set("trust proxy",1)
const PORT = process.env.PORT 
app.use(express.json())
app.use(cors())
app.use(helmet())


app.use(["/api", "/share"], apiLimiter);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin",adminRoutes)
app.use("/api/post",postRoutes)
app.use("/api/share",shareRoutes)
app.use("/api/like",likeRoutes)
app.use("/api/comments",commentRoutes)
app.use(errorHandler)

app.get("/health",(req:Request,res:Response)=> {
 res.status(200).json({message:"Server is running fine"})
})


async function startServer(){
    await connectDB();
 app.listen(PORT,()=>{
    console.clear()
    console.log(`Server is running on port ${PORT}`)
})

}

startServer().catch((error)=>{
    console.error("Error starting the server:", error);
    process.exit(1);
})