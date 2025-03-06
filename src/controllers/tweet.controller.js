import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

//when you need to authenticate the user the data comes from req.user or else it comes from req.params
const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;
    const { userId } = req.user._id;

    if (!content) {
        throw new ApiError(400, "Tweet not found");
    }
    const tweet = await Tweet.create({
        content: content,
        owner: userId
    });

    const postedTweet = await Video.findById(tweet._id);

    if (!postedTweet) {
        throw new ApiError(500, "Something went wrong while creating the tweet")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { tweet }, "Tweet created successfully"))
})


const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "User id is invalid")
    }

    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(400, "User not found")
    }

    //aggregation pipeline
    const tweets = await Tweet.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(userId) }
        },
        {
            $facet: {
                // First facet for fetching paginated tweets
                paginatedTweets: [
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                    {
                        $lookup: { from: "users", localField: "owner", foreignField: "_id", as: "userTweets" }
                    },
                    {
                        $lookup: { from: "likes", localField: "_id", foreignField: "tweet", as: "tweetLikes" }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" },
                            tweetsLikeCount: { $size: "$tweetLikes" },
                            isLiked: {
                                $cond: {
                                    if: { $in: [req.user._id, "$tweetLikes.likedBy"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            owner: 1,
                            content: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            isLiked: 1, 
                            tweetsLikeCount: 1
                        }
                    }
                ],
                // Second facet for counting total tweets
                totalCount: [
                    { $count: "totalTweets" }
                ]
            }
        }
    ]);
    // Extract paginated tweets and total count from the result
    const paginatedTweets = tweets[0].paginatedTweets;
    const totalCount = tweets[0].totalCount.length > 0 ? tweets[0].totalCount[0].totalTweets : 0;


    return res
        .status(200)
        .json(new ApiResponse(200, { paginatedTweets, totalCount }, "tweets fetched successfully"));
});


const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { content } = req.body;
    const { tweetId } = req.params;
    const { userId } = req.user._id;

    if (isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }
    if (!content) {
        throw new ApiError(400, "Nothing to update");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(400, "tweet not found")
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(400, "user not found")
    }

    if (tweet.owner.toString() !== userId.toString()) {
        throw new ApiError(400, "You are not authorized to update this tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { $set: { content: content } },
        { new: true }
    );

    if (!updatedTweet) {
        throw new ApiError(400, "Something went wrong while updating the tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { updatedTweet }, "tweet updated successfully"))
});


const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;
    const { userId } = req.user._id;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(200, "Invald tweet id")
    }

    const tweet = await findById(tweetId)
    if (!tweet) {
        throw new ApiError(200, "tweet not found")
    }

    const user = await findById(userId);
    if (!user) {
        throw new ApiError(200, "User not found")
    }

    if (tweet.owner.toString() !== userId.toString()) {
        throw new ApiError(200, "You are not authorized to delete others tweet")
    }

    const deletedTweet = await findByIdAndDelete(tweetId);
    if (!deletedTweet) {
        throw new ApiError(400, "something went wrong while deleting the tweet")
    }

    return res
        .status(200)
        .json(new ApiResponse(400, {}, "Tweet was deleted successfully"))
});


export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}

