import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { User } from "../models/user.models.js"


const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const existingVideoLike = await Like.findOne({ video: videoId, likedBy: req.user?._id });

    if (existingVideoLike) {
        // Delete the existing like
        const deleteLike = await Like.findByIdAndDelete(existingVideoLike._id);
        if (!deleteLike) {
            throw new ApiError(500, "Internal server error while removing the like");
        } else {
            return res
                .status(200)
                .json(new ApiResponse(200, { deleteLike }, "Like deleted successfully"));
        }

    } else {
        // Create a new like
        const likeVideo = await Like.create({ video: videoId, likedBy: req.user?._id });
        if (!likeVideo) {
            throw new ApiError(500, "Internal server error while liking the video");
        } else {
            return res
                .status(200)
                .json(new ApiResponse(200, { likeVideo }, "Video liked successfully"));
        }
    }
});



const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const existingCommentLike = await Like.findOne(
        { comment: commentId },
        { likedBy: req.user?._id }
    );

    if (existingCommentLike) {
        // Delete the existing like
        const deleteLike = await Like.findByIdAndDelete(existingCommentLike._id);
        if (!deleteLike) {
            throw new ApiError(500, "Internal server error while removing the like");
        } else {
            return res
                .status(200)
                .json(new ApiResponse(200, { deleteLike }, "Like deleted successfully"));
        }

    } else {
        // Create a new like
        const likeComment = await Like.create({ comment: commentId, likedBy: req.user?._id });
        if (!likeComment) {
            throw new ApiError(500, "Internal server error while liking the comment");
        } else {
            return res
                .status(200)
                .json(new ApiResponse(200, { likeComment }, "Comment liked successfully"));
        }

    }
});


const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(200, "Invalid tweet id")
    }

    const existingTweetLike = await Like.findOne(
        { tweet: tweetId },
        { likedBy: req.user?._id }
    );

    if (existingTweetLike) {
        //delete existing like
        const deleteTweetLike = await Like.findByIdAndDelete(existingTweetLike._id);

        if (!deleteTweetLike) {
            throw new ApiError(500, "Something went wrong while removing the like")
        } else {
            return res
                .status(200)
                .json(new ApiResponse(200, { deleteTweetLike }, "Like removed successfully"));
        }

    } else {
        //create a new like
        const addTweetLike = await Like.create(
            { tweet: tweetId, likedBy: req.user?._id }
        );

        if (!addTweetLike) {
            throw new ApiError(500, "internal server error while liking the tweet")
        } else {
            return res
                .status(200)
                .json(new ApiResponse(200, { addTweetLike }, "successfully liked tweet"))
        }
    }
});



const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!isValidObjectId(userId)) {
        throw new ApiError(200, "Invalid user id")
    }

    const likedVideos = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "likes", localField: "_id", foreignField: "likedBy", as: "videoLikes",
                pipeline: [{
                    $lookup: {
                        from: "videos", localField: "video", foreignField: "_id", as: "allLikedVideos",
                        pipeline: [{
                            $lookup: {
                                from: "users", localField: "owner", foreignField: "id", as: "videoOwner"
                            }
                        }]
                    }
                }]
            }
        },
        {
            $addFields: {
                totalLikedVideos: { $size: "$videoLikes" },
                allLikedVideos: "$videoLikes.allLikedVideos",
            }
        },
        {
            $project: {
                _id: 0,
                totalLikedVideos: 1,
                allLikedVideos: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    isPublished: 1,
                    createdAt: 1,
                    updatedAt: 0
                },
                videoOwner: {
                    userName: 1,
                    fullName: 1,
                    avatar: 1
                },
            }
        }

    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Successfully fetched all liked videos"));
})





export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}