import mongoose, { Schema } from "mongoose";
import Jwt from "jsonwebtoken";
import bcrypt from "bcrypt" //used for hasing password basically encryption

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true //used for searching
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String, //cloudinary url (we gonna use url to store the images)
        required: true,
    },
    coverImage: {
        type: String, // //cloudinary url (we gonna use url to store the images)
    },  
    watchHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video"
    }],
    password: {
        type: String,
        required: [true, "password is required"]
    },
    refreshToken: {
        type: String,
    }
}, { timestamps: true });


//pre hooks used just before saving the password used to encrypt the password
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10)  //using bcrypt to hash the password 
    }
    next();
});


userSchema.methods.isPasswordCorrect = async function (password) { // method for checking that the pasword entered is correct or not whether it matches with the encrypted password it decrypts the password
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    //payload
    return Jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    },

        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return Jwt.sign({
        _id: this._id,
    },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);