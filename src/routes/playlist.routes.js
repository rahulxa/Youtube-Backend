import { Router } from "express";
import {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
} from "../controllers/playlist.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const playlistRouter = Router();
playlistRouter.use(verifyJWT);

playlistRouter.route("/create-playlist").post(createPlaylist);

playlistRouter.route("/get-user-playlist/:userId").get(getUserPlaylists);

playlistRouter.route("/get-playlistBy-Id/:playlistId").get(getPlaylistById);

playlistRouter.route("/add-video-to-playlist/:videoId/:playlistId").patch(addVideoToPlaylist);

playlistRouter.route("/remove-video-playlist/:videoId/:playlistId").patch(removeVideoFromPlaylist);

playlistRouter.route("/delete-playlist/:playlistId").delete(deletePlaylist);

playlistRouter.route("/update-playlist/:playlistId").patch(updatePlaylist)

export default playlistRouter;