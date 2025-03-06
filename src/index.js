//main js file which gets executed

import connectDB from "./db/index.js";
import dotenv from "dotenv"
import { app } from "./app.js"

//method 2 to connect to database (better approach)
//configuring dotenv 
dotenv.config({
    path: "./env"
})
connectDB()
    .then(() => {

        app.on("error", (err) => {
            console.log("error connecting to the server:", err)
            throw err;
        });

        app.listen(process.env.PORT || 8000, () => {
            console.log("server listening at port:", process.env.PORT)
        });
    })
    .catch((err) => {
        console.log("mongo db connect fail:", err);
    });







//method 1 to connect to database
// import express from "express";
// const app = express();

// //always use try catch and use async and await while connecting to the database
// //function to connect to database
// (async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)  //connecting to database
//         app.on("error", (err) => { //the app instance listening for error incase
//             console.log(err);
//             throw err;
//         })
//         app.listen(process.env.PORT, () => { //server running on port
//             console.log(`app is listening on port ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.error("ERROR: ", error);
//         throw error;
//     }
// })();