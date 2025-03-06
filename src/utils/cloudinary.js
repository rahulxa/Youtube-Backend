import { v2 as cloudinary } from "Cloudinary"
import fs from "fs"

//configuring cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

//uploading the local file to cloudinary
const uploadOnCloudinary = async (localFilePath) => {
    try {
        // console.log("Local file path:", localFilePath);
        if (!localFilePath.trim()) {
            // console.log("Local file path is empty or contains only whitespace.");
            return null;
        }
        //upload the file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        // console.log("this is response:", response);
        //file has been uploaded
        // console.log("file uploaded successfully on cloudinary:", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally server saved temp file as the upload operation got failed
        return null;
    }
}

export { uploadOnCloudinary }


