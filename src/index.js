import connectDB from "./db/index.js";
import dotenv from "dotenv"
import { app } from "./app.js"

dotenv.config({
   path: "./env"
})

connectDB()
.then(() => {
   // app.on((error) => console.log("Express error:", error));

   app.listen(process.env.PORT || 8000, () => {
       console.log(`Server is running at port : ${process.env.PORT}`);
   })
})
.catch((error) => console.log("MONDO BD connection error:", error))
















/*
import express from "express"
const app = express()
;(async () => {
   try {
      await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

      app.on("error", (error) => {
         console.log("ERROR: ", error);
         throw error
      })

      app.listen(process.env.PORT, () => {
         console.log(`Express connected successfully`);
         console.log(`App is listening on port: ${process.env.PORT}`);
      })

   } catch (error) {
      console.log("ERROR:", error);
   }
})();
*/