import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { Video } from "../models/video.models";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/apiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    if (!userId) {
        throw new ApiError(400, "user id not found")
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user id");
    }
    const videos = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "videos", localField: "_id", foreignField: "owner", as: "videos"
            }
        },
        {
            $facet: {
                metadata: [{ $count: "totalCount" }], //count the documents
                data: [
                    { $sort: { [sortBy]: sortType === "newest" ? -1 : 1 } },//sort the data
                    { $skip: (parseInt(page) - 1) * (parseInt(limit)) }, //skips the documents
                    { $limit: parseInt(limit) } //limiting the amount of doucument
                ]
            }
        }
    ]);
    const [result] = videos; // Get the first element of the videos array

    const metadata = result.metadata[0]; // Extract metadata
    const data = result.data[0];

    return res
        .status(200)
        .json(new ApiResponse(200, { metadata, data }, "Videos fetched successfully"))
});



const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    //checking if we have recevied the title and description
    if (!title && !description) {
        throw new ApiError(400, "Title is required")
    }

    //checking if video and thumbnail local path is acquired or not
    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file local Path not found")
    }
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail local Path not found")
    }

    //uploading the files to cloudinary
    const videoFile = uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = uploadOnCloudinary(thumbnailLocalPath);

    //checking if the files got uploaded in cloudinary
    if (!videoFile) {
        throw new ApiError(400, "Video not uploaded")
    }
    if (!thumbnail) {
        throw new ApiError(400, "thumbnail not uploaded")
    }

    //creating a video document in db
    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: videoFile.duration,
        isPublished: true,
        owner: req.user._id
    });

    //checking if finally the video document has been created or not 
    const uploadedVideo = await Video.findById(video._id);
    if (!uploadedVideo) {
        throw new ApiError(500, "something went wrong while publishing the video");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, uploadedVideo, "Video uploaded successfully"))
});


/////****///**** */ */
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    //checking if the id is valid or not
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const videoObjectId = mongoose.Types.ObjectId(videoId);

    const video = await Video.findById(videoObjectId);
    if (!video) {
        throw new ApiError(400, "video does not exists")
    }

    const videoOwner = await Video.aggregate([
        {
            $match: { _id: video._id } //checking if the video doucment with that particular id exists or not
        },
        {
            $lookup: { from: "users", localField: "owner", foreignField: "_id", as: "owner" }
        },
        {
            $project: { userName: 1 }
        },
        {
            $lookup: { from: "likes", localField: "_id", foreignField: "video", as: "likes" }
        },
        {
            $addFields: {
                videoLikes: { $size: "$likes" },
                isLiked: { $cond: { if: { $in: [req.user?._id, "$likes.likedBy"] } } }
            }
        },
    ]);

    if (!videoOwner?.length) {
        throw new ApiError(400, "video not found");
    }

    if (!videoOwner[0].isPublished) {
        throw new ApiError(400, "This video is private");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videoOwner[0], "Video fetched succesfully"));
});



const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const { videoId } = req.params;
    const { title, description } = req.body;
    const localThumbnailPath = req.file?.path;

    if (!title || !description) {
        throw new ApiError(200, "title or description not found")
    }
    if (!localThumbnailPath) {
        throw new ApiError(400, "thumbnail local path found")
    }
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    //finding the user by id
    const videoObjectId = mongoose.Types.ObjectId(videoId);
    const video = await Video.findById(videoObjectId);

    if (!video) {
        throw new ApiError(400, "video not found");
    }
    //holding the old thumbnail url
    const deleteOldThumbnail = video.thumbnail;

    //uploading new thumbnail on coludinary
    const newThumbnailURL = await uploadOnCloudinary(localThumbnailPath);
    if (!newThumbnailURL.url) {
        throw new ApiError(400, "failed to upload thumbnail to cloudinary")
    }

    //updating the details on database
    const updatedvideo = await Video.findByIdAndUpdate(
        videoObjectId,
        {
            $set: {
                title: title,
                description: description,
                thumbnail: newThumbnailURL.url
            },
        },
        { new: true }
    );

    //deleting the old thumbnail from cloudinary
    deleteFromCloudinary(deleteOldThumbnail);


    return res
        .status(200)
        .json(new ApiResponse(
            200,
            { updatedvideo },
            "video details updated successfully"
        ));
});


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const videoObjectId = mongoose.Types.ObjectId(videoId);

    const deletedvideo = await Video.findByIdAndDelete(videoObjectId);

    if (deletedvideo === null) {
        throw new ApiError(400, "video not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        ));
});



const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "video id is invalid")
    }
    const videoObjectId = mongoose.Types.ObjectId(videoId);
    const video = await Video.findById(videoObjectId);

    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    let updateStatus;
    if (video.isPublished) {
        updateStatus = await Video.findByIdAndUpdate(
            video._id,
            { $set: { isPublished: false } },
            { new: true }
        ).select("-views", "-videoFile", "-title", "-description");
    } else {
        updateStatus = await Video.findByIdAndUpdate(
            video._id,
            { $set: { isPublished: true } },
            { new: true }
        )
    }

    return res
        .status(200)
        .json(new ApiResponse(400, { updateStatus }, "video status changed successfully"))
});




export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}