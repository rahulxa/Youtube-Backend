//async handler created to talk to the database multiple times
//using promises
const asyncHandler = (requestHandler) => {
     return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}

export { asyncHandler }











//using try catch
// const asyncHandler = (func) => async (req, res, next) => {
//     try {
//         await func(req, res, n`ext)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }

// export { asyncHandler }

