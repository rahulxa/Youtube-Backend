import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const { userId } = req.user?._id;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id")
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const existingSubscriber = await Subscription.findOne({
        channel: channelId,
        subscriber: userId
    });

    if (existingSubscriber) {
        const removeSubscriber = await Subscription.findByIdAndDelete(existingSubscriber._id)
        if (!removeSubscriber) {
            throw new ApiError(500, "Something went wrong while removing you as subscriber")
        } else {
            return res
                .status(200)
                .json(new ApiResponse(200, {}, "Subscription removed successfully"))
        }
    } else {
        const addSubscriber = await Subscription.create({
            subscriber: userId,
            channel: channelId
        });
        if (!addSubscriber) {
            throw new ApiError(500, "Something went wrong while subscribing the channel")
        } else {
            return res
                .status(200)
                .json(new ApiResponse(200, {}, "Channel Subscribed!"))
        }
    }
});


// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel Id")
    }

    const subscribersList = await Subscription.aggregate([
        {
            $match: { channel: new mongoose.Types.ObjectId(channelId) }
        },
        {
            $lookup: {
                from: "users", localField: "channel", foreignField: "_id", as: "subscribers"
            }
        },
        {
            $addFields: {
                totalSubscribers: { $size: "$subscribers" },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                totalSubscribers: 1,
                isSubscribed: 1,
                fullName: "$subscribers.fullName",
                avatar: "$subscribers.avatar",
                userName: "$subscribers.userName"
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, subscribersList, "Subscriber list fetched successfully"))
});


// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber id")
    }

    const subscribedChannel = await Subscription.aggregate([
        {
            $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) }
        },
        {
            $lookup: {
                from: "users", localField: "channel", foreignField: "_id", as: "subscribedChannel",
            }
        },
        {
            $addFields: {
                subscribedChannel: { $arrayElemAt: ["$subscribedChannel", 0] }
            }
        },
        {
            $project: {
                _id: 0,
                fullName: "$subscribedChannel.fullName",
                avatar: "$subscribedChannel.avatar"
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, subscribedChannel, "Channel list fetched successfully"))
});




export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}