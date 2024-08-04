// if we want to wrap any function in async-await then we can use this 
// utility


const asyncHandler = (fn) => {
   return async (req, res, next) => {
      try {
         await fn(req, res, next)
      } catch (error) {
         res.status(error.code || 500).json({
            success: false,
            message: error.message
         })
      }
   }
}


export { asyncHandler }