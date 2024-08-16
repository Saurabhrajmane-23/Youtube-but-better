import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async(userId) =>{
   try {
       const user = await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()
       

       user.refreshToken = refreshToken
       await user.save({ validateBeforeSave: false })

       return {accessToken, refreshToken}


   } catch (error) {
       throw new ApiError(500, "Something went wrong while generating referesh and access token")
   }
}
 
const registerUser = asyncHandler( async (req, res) => {

   // accept data from frontend
   const {fullName, email, username, password} = req.body
   console.log("email: ", email);
   console.log(req.body);

   // validation
   if (
      [username, password, email, fullName].some((field) => {
         field?.trim() === ""
      })
   ) {
      throw new ApiError(400, "All fields are compulsory")
   }

   // check if user already exists
   const existingUser = await User.findOne({
      $or: [{ username }, { email }]
  })

  if (existingUser) {
      throw new ApiError(409, "User with email or username already exists")
  }

   // check for images and avatar
   const avatarLocalPath = await req.files?.avatar[0]?.path
   // const coverImageLocalPath = await req.files?.coverImage[0]?.path
   let coverImageLocalPath;
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files.coverImage[0].path
   }
   
   

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

const loginUser = asyncHandler( async (req, res) => {
   // request data from frontend req.body
   const {username, email, password} = req.body

   // username or email
   if (!username && !email) {
      throw new ApiError(400, "username and email are required")
   }

   // find the user
   const user = await User.findOne({
      $or: [{username}, {email}]
   })

   if (!user) {
      throw new ApiError(404, "User does not exist")
   }

   // check password
   const passValidation = await user.isPasswordCorrect(password)
   if (!passValidation) {
      throw new ApiError(401, "Password incorrect")
   }

   // genrate access and refresh token
   const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
   

   // send cookie
   const loggedInUser = await User.findOne(user._id).select("-password -refreshToken")

   const options = {
      httpOnly: true,
      secure: true
   }

   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
      new ApiResponse(
         200,
         {
            user: loggedInUser, accessToken, refreshToken
         },
         "User logged in successfully"
      )
   )

})

const logoutUser = asyncHandler( async (req, res) => {
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined
         }
      },
      {
         new: true
      }
   )

   const options = {
      httpOnly: true,
      secure: true
   }
   return res
   .status(200)
   .clearCookie("accessToken")
   .clearCookie("refreshToken")
   .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler( async( req, res ) => {
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
      throw new ApiError(401, "Unauthorized request")
   }

   const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

   try {
      const user = await User.findById(decodedToken._id)
   
      if (!user) {
         throw new ApiError(401, "Invalid refresh token")
      }
   
      if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "Refresh token has expired or have been used")
      }
   
      const options = {
         httpOnly: true,
         secure: true
      }
   
      const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
   
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refereshToken", newRefreshToken, options)
      .json(
         new ApiResponse(
            200,
            {accessToken, refreshToken: newRefreshToken},
            "Access Token refreshed successfully"
         )
      )
   } catch (error) {
      throw new ApiError(401, error?.message || "Invalid Refresh token")
   }

})

const changeCurrentPassword = asyncHandler( async (req, res) => {
   const {oldPassword, newPassword, confirmPassword} = req.body

   const user = await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordCorrect) {
      alert("Incorrect password")
      throw new ApiError(400, "Incorrect old password")
   }

   if (newPassword !== confirmPassword) {
      alert("new password and confirm password must be same")
      throw new ApiError(409, "new and confirm password not same")
   }

   user.password = newPassword
   await user.save({validateBeforeSave: false})

   return res
   .status(200)
   .json(200, {}, "password changed successfully")


})

const getCurrentUser = asyncHandler( async(req, res) => {
   return res
   .status(200)
   .json(
      200,
      req.user,
      "current user fetched successfully"
   )
})

const updateUserDetails = asyncHandler( async(req, res) => {
   const {fullName} = req.body

   if (!fullName) {
      throw new ApiError(400, "fullName is required field")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            fullName: fullName
         }
      },
      {new: true}
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200, user, "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req, res) => {
   const avatarLocalPath = req.file?.path

   if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar is required")
   }

   const avatar = await User.uploadOnCloudinary(avatarLocalPath)

   if (!avatar?.url) {
      throw new ApiError(400, "Avatar is not generating url")
   }

   const user = await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            avatar: avatar.url
         }
      },
      {new: true}
   ).select("-password")

   return res
   .status(200)
   .json(200, user, "Avatar updated successfully")
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
   const coverImageLocalPath = req.file?.path

   if (!coverImageLocalPath) {
      throw new ApiError(400, "coverImage is required")
   }

   const coverImage = await User.uploadOnCloudinary(coverImageLocalPath)

   if (!coverImage?.url) {
      throw new ApiError(400, "coverImage is not generating url")
   }

   const user = await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            coverImage: coverImage.url
         }
      },
      {new: true}
   ).select("-password")

   return res
   .status(200)
   .json(200, user, "coverImage updated successfully")
})

export { registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateUserDetails,
   updateUserAvatar,
   updateUserCoverImage }