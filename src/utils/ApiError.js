class ApiError extends Error {
   constructor(
      statusCode,
      message = "Something went wrong",
      errors = []
   ){
      super(message)
      this.statusCode = statusCode
      this.data = null
      this.success = false
      this.message = message
      this.errors = errors
   }
}

export { ApiError }