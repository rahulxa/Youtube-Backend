import { v2 as cloudinary } from "Cloudinary"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const deleteFromCloudinary = async (imageUrl) => {
    try {
        const response = await cloudinary.uploader.destroy(imageUrl, { validate: false });
        return response;
    } catch (error) {
        return null;
    }
}

export { deleteFromCloudinary }