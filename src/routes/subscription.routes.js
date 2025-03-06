import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
} from "../controllers/subscription.controller";

const subscriptionRouter = Router();
subscriptionRouter.use(verifyJWT);

subscriptionRouter.route("/toggle-subscription/:channelId").post(toggleSubscription);

subscriptionRouter.route("/get-user-channel-subs/:subscriberId").get(getUserChannelSubscribers);

subscriptionRouter.route("/get-subscribed-channels/:channelId").get(getSubscribedChannels);

export default subscriptionRouter;