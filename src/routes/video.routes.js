import { Router } from "express";
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
    from "../controllers/video.controller";

import { verifyJWT } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";

const videoRouter = Router();
videoRouter.use(verifyJWT); //authentication for all routes 

videoRouter.route("/get-all-videos").get(getAllVideos);

videoRouter.route("/publish-A-video").post(
    upload.fields([
        {
            name: "videofile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    publishAVideo);

videoRouter.route("/:videoId").get(getVideoById);

videoRouter.route("/:videoId").patch(upload.single("thumbnail"), updateVideo);

videoRouter.route("/:videoId").delete(deleteVideo);

videoRouter.route("/toggle-Publish-Status/:videoId").patch(togglePublishStatus);

export default videoRouter;




