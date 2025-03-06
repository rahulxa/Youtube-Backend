import { Router } from "express";
import {
    changeCurrentUserPassword,
    getNewAccessToken,
    loginUser,
    logoutUser,
    registerUser,
    currentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelprofile,
    getWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const userRouter = Router();

userRouter.route("/register").post(
    upload.fields([  //middleware
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser);

userRouter.route("/login").post(loginUser);

//secured routes requires verification
userRouter.route("/logout").post(verifyJWT, logoutUser);

userRouter.route("/refresh-token").post(getNewAccessToken);

userRouter.route("/change-password").post(verifyJWT, changeCurrentUserPassword);

userRouter.route("/current-user").get(verifyJWT, currentUser)

userRouter.route("/update-account-details").patch(verifyJWT, updateAccountDetails)

userRouter.route("/user-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)

userRouter.route("/user-cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

userRouter.route("/c/:username").get(verifyJWT, getUserChannelprofile);

userRouter.route("/watch-history").get(verifyJWT, getWatchHistory);

export default userRouter;