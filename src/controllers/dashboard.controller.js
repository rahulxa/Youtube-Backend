import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"


const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total likes etc.
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const channelStats = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos"
            }
        },
        {
            $project: {
                totalVideos: { $size: "$videos" }, //total videos
                totalViews: { $sum: "$videos.views" } //total video views
            }
        },
        {
            $lookup: {
                from: "subscriptions"
                , localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $project: {
                totalSubscribers: { $size: "subscribers" }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videoOwner",
                pipeline: [
                    {
                        $lookup:
                        {
                            from: "likes",
                            localField: "_id",
                            foreignField: "video",
                            as: "videoLikes"
                        }
                    },
                    {
                        $unwind: "$videoLikes"
                    },
                    {
                        $group: {
                            _id: null,
                            totalLikes: { $sum: 1 }
                        }
                    }
                ]
            }
        },
        {
            $project: {
                totalVideos: 1,
                totalViews: 1,
                totalSubscribers: 1,
                totalLikes: { $arrayElemAt: ["$videoOwner.totalLikes", 0] } //extracting total likes from video owner array
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, channelStats, "channel stats fethced successfully"))

});


const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const { userName } = req.params; //channel name

    if (!userName?.trim()) {
        throw new ApiError(400, "username is missing");
    }

    const videos = await User.aggregate([
        {
            $match: { userName: userName?.toLowerCase() }
        },
        {
            $lookup: {
                from: "videos", localField: "_id", foreignField: "owner", as: "totalVideos"
            }
        },
        {
            $project: {
                totalVideos: {
                    $map: {
                        input: "$totalVideos",
                        as: "video",
                        in: {
                            videoFile: "$$video.videoFile",
                            thumbnail: "$$video.thumbnail",
                            owner: "$$video.owner",
                            title: "$$video.title",
                            description: "$$video.description",
                            duration: "$$video.duration",
                            views: "$$video.views",
                            isPublished: "$$video.isPublished",
                            createdAt: "$$video.createdAt"
                        }
                    }
                }
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "videos fetched successfully"));
});


export {
    getChannelStats,
    getChannelVideos
}