import { user } from "../model/userModel";
import { Post } from "../model/postModel";
import { Comment } from "../model/commentModel";

type UserDoc = InstanceType<typeof user>

// Safe for anyone to see
export function toPublicProfile(user: UserDoc) {
  return {
    id: user._id,
    userName: user.userName,
    fullName: user.fullName,
    bio: user.bio,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

// For the logged-in user's own account only
export function toPublicUser(user: UserDoc) {
  return {
    ...toPublicProfile(user),
    email: user.email,
    isVerified: user.isVerified,
    role:user.role
  };
}

export function toAdminUser(user:UserDoc){
    return{
        ...toPublicUser(user),
        isSuspended:user.isSuspended,
        providers:user.providers.map((p:any)=>p.providers),
        updatedAt:user.updatedAt

    }
}



type PostDoc = InstanceType<typeof Post>;

export function toPostAuthor(user: UserDoc) {
  return {
    id: user._id,
    username: user.userName,
    fullName: user.fullName,
    avatar: user.avatar,
  };
}

export function toPost(
  post: PostDoc,
  author: UserDoc,
  viewer: { liked: boolean; bookmarked: boolean } = { liked: false, bookmarked: false }
) {
  return {
    id: post._id,
    author: toPostAuthor(author),
    caption: post.caption,
    media: post.media.map((m) => ({
      url: m.url,
      type: m.type,
      width: m.width,
      height: m.height,
    })),
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    likedByMe: viewer.liked,
    bookmarkedByMe: viewer.bookmarked,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    editedAt: post.editedAt ?? null,
  };
}

//   const postIds = docs.map((p) => p._id);
//   const [authors, bookmarked, liked] = await Promise.all([
//     user.find({ _id: { $in: authorIds } }),
//     getBookmarkedIds(viewerId, postIds),
//     getLikedIds(viewerId, postIds),

//   ]
//     return [toPost(post, author, { liked: liked.has(post.id), bookmarked: bookmarked.has(post.id) })];
// );


type CommentDoc = InstanceType<typeof Comment>;

export function toComment(comment: CommentDoc, author: UserDoc) {
  return {
    id: comment._id,
    postId: comment.post,
    author: toPostAuthor(author),
    text: comment.text,
    createdAt: comment.createdAt,
  };
}