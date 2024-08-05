import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { upload } from "../middlewares/multer.middleware.js"
import { ApiResponse } from "../utils/ApiResponse.js"
 
const registerUser = asyncHandler( async (req, res) => {

   // accept data from frontend
   const {fullName, email, username, password} = req.body
   console.log("email: ", email);

   // validation
   if (
      [username, password, email, fullName].some((field) => {
         field?.trim() === ""
      })
   ) {
      throw new ApiError(400, "All fields are compulsory")
   }

   // check if user already exists
   const existingUsername = User.find({username})

   if (existingUsername) {
      throw new ApiError(409, `User with username "${User.username}" already exists`)
   }

   const existingEmail = User.find({email})

   if(existingEmail) {
      throw new ApiError(409, `User with email already exists`)
   }

   // check for images and avatar
   const avatarLocalPath = req.files?.avatar[0]?.path
   const coverImageLocalPath =  req.files?.coverImage[0]?.path

   if(!avatarLocalPath){
      throw new ApiError(400, "Avatar image is required")
   }

   // upload images to cloudinary
   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar){
      throw new ApiError(400, "Avatar image is required")
   }

   // create an user object and uplod it to mongoDB
   const user = await User.create({
      username: username.toLowerCase(),
      email,
      fullName,
      password,
      avatar: avatar.url,
      coverImage: coverImage?.url || ""
   })

   // remove password and refresh token
   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken" // weired syntax
   )

   // check if user is created
   if(!createdUser){
      throw new ApiError(500, "something went wrong while registering user")
   }

   // send response
   return res.status(201).json(
      new ApiResponse(200, createdUser, "User created successfully")
   )
})

export { registerUser }