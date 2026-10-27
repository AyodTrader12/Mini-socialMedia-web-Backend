import {model,Schema} from "mongoose"

const likeSchema = new Schema({
    user:{type:Schema.Types.ObjectId,ref:"user",unique:true},
    post:{type:Schema.Types.ObjectId,ref:"post",unique:true},
},
{timestamps:{createdAt:true,updatedAt:false}}
)

likeSchema.index({user:1,post:1},{unique:true})

likeSchema.index({post:1,createdAt: -1})

export const Like = model("Like",likeSchema)