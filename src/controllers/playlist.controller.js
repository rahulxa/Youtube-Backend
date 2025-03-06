import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description, isPrivate } = req.body;
    const userId = req.user?._id;

    if (!name) {
        throw new ApiError(400, "Name is required");
    }

    const playlist = await playlist.create({
        name,
        description,
        isPrivate,
        owner: userId
    });

    if (!playlist) {
        throw new ApiError(400, "Something went wrong while creating the playlist")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { playlist }, "Playlist created successfully"))
});


const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10, videoId } = req.query;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "User id is invalid");
    }

    if (videoId && !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(400, "User not found")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "video not found")
    }

    const playlists = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "playlists",
                localField: "_id",
                foreignField: "owner",
                as: "playlists",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "videos",
                            foreignField: "_id",
                            as: "videos"
                        }
                    },
                    {
                        $addFields: {
                            "videos": {
                                $sort: { createdAt: -1 },
                            }
                        }
                    },
                    {
                        $addFields: {
                            "videos": {
                                $limit: 1,
                                $addFields: {
                                    "thumbnail": "$thumbnail"
                                }
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "videosOwner"
                        }
                    }
                ]
            }
        },
        {
            $project: {
                "playlists.name": 1,
                "playlists.description": 1,
                "videosOwner.userName": 1,
                "videos.thumbnail": 1 // Projection for the thumbnail field
            }
        },
        {
            $unwind: "$playlists"
        },
        {
            $skip: ((parseInt(page) - 1 * parseInt(limit)))
        },
        {
            $limit: parseInt(limit)
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, { playlists }, "playlists fetched successfully"))
})



const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlistid = await Playlist.findById(playlistId);

    if (!playlistid) {
        throw new ApiError(400, "playlist not found");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) }
        },
        {
            $lookup: {
                from: "videos", localField: "videos", foreignField: "_id", as: "videos"
            }
        },
        {
            $match: {
                "videos.isPublished": true,
            },
        },
        {
            $lookup: {
                from: "users", localField: "owner", foreignField: "_id", as: "videoOwner"
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                owner: {
                    $first: "$videoOwner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    thumbnail: 1,
                    video: 1,
                    title: 1,
                    description: 1,
                    createdAt: 1,
                    duration: 1,
                    views: 1,
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1
                }
            }
        }
    ]);


    return res
        .status(200)
        .json(new ApiResponse(200, { playlist }, "playlist fetched successfully"))
});



const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;


    if (!isValidObjectId(playlistId) && !isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid video id or playlist id")
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(200, "video not found")
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(200, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString() || video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(200, "You are unauthorized to add this video to your playlist")
    }

    const addVideoToPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $set: { videos: videoId } },
        { new: true }
    );

    if (!addVideoToPlaylist) {
        throw new ApiError(200, "Could not add video to the playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(400, { addVideoToPlaylist }, "Video added successfully to the playlist"));
});



const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) && !isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid video id or playlist id")
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(200, "video not found")
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(200, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString() || video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(200, "You are unauthorized to remove this video")
    }

    const removeVideoFromPlaylist = await Playlist.updateOne(
        { _id: playlistId },
        { $pull: { videos: videoId } }
    );

    if (!removeVideoFromPlaylist) {
        throw new ApiError(200, "Something went wrong while removing the video from playlist")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video successfully removed from playlist"));
})



const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(200, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(200, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(200, "You are unauthorized to delete this playlist")
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(
        playlistId,
        { new: true }
    );

    if (!deletedPlaylist) {
        throw new ApiError(200, "Something went wrong while deleting the playlist")
    }

    return res
        .status(200)
        .json(200, {}, "Playlist deleted successfully");
})


const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    if (!name || !description) {
        throw new ApiError(400, "Name or description required")
    }

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set:
            {
                name: name,
                description: description
            }
        },
        { new: true }
    );

    if (!updatePlaylist) {
        throw new ApiError(400, "Something went wrong while updating the playlist")
    }

    return res
        .status(200)
        .json(200, { updatePlaylist }, "playlist updated succesfully")
})





export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}