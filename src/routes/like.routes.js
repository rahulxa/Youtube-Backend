import { Router } from "express";
import {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
} from "../controllers/like.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const likeRouter = Router();

likeRouter.use(verifyJWT);

likeRouter.route("/toggle-video-like/:videoId").post(toggleVideoLike);

likeRouter.route("/toggle-comment-like/:commentId").post(toggleCommentLike);

likeRouter.route("/toggle-tweet-like/:tweetId").post(toggleTweetLike);

likeRouter.route("/get-liked-videos").get(getLikedVideos);

export default likeRouter
