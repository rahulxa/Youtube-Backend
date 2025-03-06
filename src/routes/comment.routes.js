import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
} from "../controllers/comment.controller";

const commentRouter = Router();

commentRouter.use(verifyJWT);

commentRouter.route("/videoId").get(getVideoComments);

commentRouter.route("/videoId").post(addComment);

commentRouter.route("/commentId").patch(updateComment);

commentRouter.route("/commentId").delete(deleteComment);

export default commentRouter;