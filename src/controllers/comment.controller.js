import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"


const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const comments = await Video.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(videoId) }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "videoComments",
                pipeline: [
                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "comment",
                            as: "videoLikes",
                            pipeline: [
                                {
                                    $lookup: {
                                        from: "users",
                                        localField: "likedBy",
                                        foreignField: "_id",
                                        as: "commentOwner"
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $project: {
                videoComments: {
                    content: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    video: 1,
                    videoLikes: {
                        likedBy: 1,
                        commentOwner: {
                            userName: 1,
                            avatar: 1
                        }
                    }
                },
                totalLikes: {
                    $size: "$videoComments.videoLikes"
                }
            }
        }
    ]);

    if (!comments) {
        throw new ApiError(400, "Failed to get video comments")
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    const getAllComments = await Comment.aggregatePaginate(comments, options);

    if (!getAllComments) {
        throw new ApiError(400, "Failed to fetch comments")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, getAllComments, "Comments fetched successfully"));

});


const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { userId } = req.user?._id;
    const { content } = req.body;
    const { videoId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(400, "User not found")
    }

    const comment = await Comment.create({
        content: content,
        owner: req.user?._id
    });

    if (!comment) {
        throw new ApiError(400, "Comment not created")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment created successfully"))
});


const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { userId } = req.user?._id;
    const { videoId, commentId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(400, "User not found")
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(400, "Comment not found")
    }

    if (user._id.toString() !== comment.owner.toString()) {
        throw new ApiError(400, "You are unauthorized to update this comment")
    }

    const updateComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: { content: content }
        },
        { new: true }
    );

    if (!updateComment) {
        throw new ApiError(500, "Failed to update comment")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { updateComment }, "Comment updated successfully"))
});


const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;
    const { userId } = req.user?._id;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(400, "User not found")
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(400, "Comment not found")
    }

    if (user._id.toString() !== comment.owner.toString()) {
        throw new ApiError(400, "You are unauthorized to update this comment")
    }

    const deleteComment = await Comment.findByIdAndDelete(commentId);

    if (!deleteComment) {
        throw new ApiError(500, "Something went wrong while deleting the comment")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"))
})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}