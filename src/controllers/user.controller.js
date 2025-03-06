import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
// import { response } from "express";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js"
import mongoose from "mongoose";


//get details from the user
//validation for correctness - not empty
//check if user already exists :via username or email
//if files are present ie images
//upload them to cloudinary, avatar
//create user object - create entry in db
//remove password, refresh token field from response
//check for user creation 
//return response


//method to generate tokens
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId); //finding the user by its id
        const accessToken = user.generateAccessToken() //getting the method
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken; //setting the object value
        await user.save({ validateBeforeSave: false }); //only saving the newly created refresh token to the database and not others

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens")
    }
}



//registering user
const registerUser = asyncHandler(async (req, res) => {


    const { fullName, email, userName, password } = req.body;
    // console.log("email:", email);
    // console.log("this is req body:", req.body);

    //validation for all feilds
    if ([fullName, email, password, userName].some((feild) => { return feild?.trim() == "" })) {
        throw new ApiError(400, "All feilds are required")
    }

    //checking if a user with the same username or passowrd already exists in the db
    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })

    //if the user already exists
    if (existedUser) {
        throw new ApiError(409, "User already exists")
    }

    // console.log("thjis is files:", req.files)
    //getting the file stored by multer in our server locally
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // console.log(avatarLocalPath);
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;


    let coverImage
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
        // console.log("cover image local path :", coverImageLocalPath);
    }


    //if the avatar doesnot exists
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file local path is required");
    }

    //uploading avatar on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    //  //////////**** */
    //checking if avatar uploaded on cloudinary
    if (!avatar) {
        throw new ApiError(400, "Avatar file image is required");
    }

    // saving to database and creating user document in json like object
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || " ",
        email,
        password,
        userName: userName.toLowerCase()
    });

    //checking finally if the user is created or not and removing from response what is not required using (select)
    //the user id gets generated automatically in mongo db
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    // console.log(createdUser)

    //finally if the user is registered
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully"),
    )
});


//user login
const loginUser = asyncHandler(async (req, res) => {
    //get username and password
    const { email, userName, password } = req.body;

    //check if req.body has no username and password 
    if (!userName && !email) {
        throw new ApiError(400, "Username or password required")
    }

    //check database with the given usrname or email
    const user = await User.findOne({
        $or: [{ userName }, { email }]
    })

    //if user does not exists
    if (!user) {
        throw new ApiError("404", "User does not exist");
    }
    ////////////////////////////////////


    //checking user with password the (user.isPasswordCorrect method is what we get from the req.body which we have created its not the same the User schema's User)
    const checkPassword = await user.isPasswordCorrect(password);

    if (!checkPassword) {
        throw new ApiError(401, "Password is incorrect");
    }


    //if username and password are correct then generate access token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    // console.log("accessToken", accessToken);
    // console.log("refreshToken", refreshToken);

    //for sending data in response 
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //cookie options
    const options = {
        httpOnly: true,
        secure: true
    }

    //sending cookies in response
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "user logged in successfully"
            )
        )
});


//user logout
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, //find the user by this id
        { $unset: { refreshToken: 1 } }, //and remove this field
        { new: true }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out Sucessfully"))
});


//generating new access and refresh token
const getNewAccessToken = asyncHandler(async (req, res) => {
    //fetching the incoming refresh token from cookies
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        //veryfing and decoding the recevied token
        const verifyToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        //finding the user with the same id
        const user = await User.findById(verifyToken?._id).select("-password");

        //if user not found
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        //validating the refresh token
        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(404, "Refresh token is expired or used");
        }

        //generating new tokens
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, { user: accessToken, refreshToken }, "New tokens generated successfully"))

    } catch (error) {
        throw new ApiError(404, error?.message || "Invalid refresh token")
    }
});


//change current user password
const changeCurrentUserPassword = asyncHandler(async (req, res) => {
    //getting the old and new password
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    //verifying the password 
    const verifyPassword = await user.isPasswordCorrect(oldPassword);

    if (!verifyPassword) {
        throw new ApiError(400, "please enter the correct old password")
    }

    //setting the new password (becrypt will automatically hash this password before saving it to the database)
    user.password = newPassword;

    //saving to the database (newly created password)
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})


//returning current user details
const currentUser = asyncHandler(async (req, res) => {
    const loggedInUser = req.user;
    return res
        .status(200)
        .json(new ApiResponse(200, { loggedInUser }, "Current user fetched successfully"))
});


//updating user account details
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        { new: true }
    ).select("-password");

    if(!user){
        throw new ApiError(500,"Failed to update Account details")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { user }, "Account details updated successfully"))
});


//updating avatar and deleting old avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarPath = req.file?.path;
    if (!avatarPath) {
        throw new ApiError(400, "Avatar path not found")
    }
    const oldAvatarToBeDeleted = await User.findById(req.user?._id);
    const cloudinaryAvatar = oldAvatarToBeDeleted.avatar;

    //updating new avatar to the cloudinary
    const avatar = await uploadOnCloudinary(avatarPath);
    if (!avatar.url) {
        throw new ApiError(400, "Error uploading avatar")
    }

    //updating the new avatar to the database
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password");

    //deleting old image from cloudinary
    deleteFromCloudinary(cloudinaryAvatar);

    return res
        .status(200)
        .json(new ApiResponse(200, { user }, "Avatar changed successfully"))
})


//updating avatar
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImagePath = req.file?.path;
    if (!coverImagePath) {
        throw new ApiError(400, "Avatar path not found")
    }
    //saving the old cover image
    const userCoverImage = await User.findById(req.user?._id);
    const oldCoverImageURL = userCoverImage.coverImage;

    const coverImage = await uploadOnCloudinary(coverImagePath);
    if (!coverImage.url) {
        throw new ApiError(400, "Error uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { coverImage: coverImage.url } },
        { new: true }
    ).select("-password")

    //if no cover image found throwing error
    if (!oldCoverImageURL) {
        throw new ApiError(400, "No cover image found")
    }
    //deleting old cover image from cloudinary
    deleteFromCloudinary(oldCoverImageURL);

    return res
        .status(200)
        .json(new ApiResponse(200, { user }, "Avatar changed successfully"))
})



const getUserChannelprofile = asyncHandler(async (req, res) => {
    const { userName } = req.params; //channel name

    if (!userName?.trim()) {
        throw new ApiError(400, "username is missing");
    }
    const channel = await User.aggregate([ //takr all User-s documents and compare from subscription doucments
        {
            $match: { userName: userName?.toLowerCase() }
        },
        { //to show subscribers
            $lookup: { from: "subscriptions", localField: "_id", foreignField: "channel", as: "subscribers" }
        },
        { //to show whom the channel has subscribed
            $lookup: { from: "subscriptions", localField: "_id", foreignField: "subscriber", as: "subscribedTo" }
        },
        {
            //showing the final subscribers count & to whom the channel has subscribed
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                channelsSubscribedTocount: { $size: "$subscribedTo" },
                //from the total count of subscribers check the subscriber id if it matches from the req.user id
                isSubscribed: { $cond: { if: { $in: [req.user?._id, "$subscribers.subscriber"] } } },
                then: true,
                else: false
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscribersCount: 1,
                channelsSubscribedTocount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "User channel fetched successfully"));
});


const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.user._id) } }, //check if this user exists in the db in the user document then it filters everything for that particular user if exists then process ahead
        {
            $lookup: { //1st lookup 1st pipeline
                from: "videos", localField: "watchHistory", foreignField: "_id", as: "watchHistory",  //matching the video id as wathchistory is an array holding videos id's(object id)
                pipeline: [{
                    $lookup: { //2nd lookup 2nd pipeline
                        from: "users", localField: "owner", foreignField: "_id", as: "owner", //further again lookup from the video document to user doucment to match the id's as owner is also referenced to user's id (to get the video owner details)
                        pipeline: [{
                            $project: { //final project to only get the required details
                                avatar: 1,
                                userName: 1
                            }      
                        }],
                    }
                },
                {
                    $addFields: { owner: { $first: "$owner" } }
                }
                ] //giving the final avatar and username in the project as object
            }
        }
        // {
        //     $project: {
        //         owner: 1,
        //         title: 1,
        //         duration: 1,
        //         description: 1,
        //         thumbnail: 1,
        //         views: 1
        //     }
        // }//the real matching occurs here comparing the local and foreign fields

    ])
    return res
        .status(200)
        .json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully"));
})




export {
    registerUser,
    loginUser,
    logoutUser,
    getNewAccessToken,
    changeCurrentUserPassword,
    currentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelprofile,
    getWatchHistory
}
