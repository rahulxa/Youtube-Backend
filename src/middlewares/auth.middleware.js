import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js";


export const verifyJWT = asyncHandler(async (req, res, next) => {
    //getting the access token form the req which has cookies cuz of cookie parser middleware
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }

        //verifying the token with the token secret, decoding the token which will contain all the payloads(user data)
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        //finding the user with the accesstoken received in the req or header(finding the user with the same access token in the database)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(401, "Invalid access token")
        }

        req.user = user;
        next();

    } catch (error) {
        throw new ApiError(401, error?.message || "invalid access token");
    }
});