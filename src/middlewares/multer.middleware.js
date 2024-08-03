import multer from "multer"

const storage = multer.diskStorage({
   destination: function (req, file, cb) {
     cb(null, './public/temp')
   },
   filename: function (req, file, cb) {
     cb(null, file.originalname)
   }
 })
 
export const upload = multer({ 
   storage
 })

/* When this middleware is used in a route, it will:

1. Intercept any multipart/form-data (file uploads) in the request.
2. Save the uploaded files to the './public/temp' directory.
3. Use the original filenames for the saved files.
4. Add a file or files object to the request, which contains information about the uploaded files.*/