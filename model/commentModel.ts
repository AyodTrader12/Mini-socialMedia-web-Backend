import {model,Schema} from "mongoose"
import { LIMITS } from "../config/limits"
export const commentSchema = new Schema({
    post:{type:Schema.Types.ObjectId,ref:"post",required:true},
    author:{type:Schema.Types.ObjectId,ref:"user",required:true},
    text:{type:String,required:true,trim:true,maxLength:LIMITS.commentLength}
},
{timestamps:{createdAt:true,updatedAt:false}}
)

commentSchema.index({post:1,createdAt: -1,id:-1})

commentSchema.index({author:1})

export const  Comment = model("Comment",commentSchema)