import { Router } from "express";
import {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
    from "../controllers/tweet.controller";

import { verifyJWT } from "../middlewares/auth.middleware";


const tweetRouter = Router();
tweetRouter.use(verifyJWT);

tweetRouter.route("/create-tweet").post(createTweet);
tweetRouter.route("/get-user-tweets/:tweetId").get(getUserTweets);
tweetRouter.route("/:tweetId").patch(updateTweet);
tweetRouter.route("/:tweetId").delete(deleteTweet);

export default tweetRouter;

