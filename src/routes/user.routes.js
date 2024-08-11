import {Router} from "express"
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
   // middleware injection
   upload.fields([
      {
         name: "avatar",
         maxCount: 1
      },
      {
         name: "coverImage",
         maxCount: 1
      }
   ]),
   // main function to run from user.controller.js
   registerUser)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT ,logoutUser)

export default router;