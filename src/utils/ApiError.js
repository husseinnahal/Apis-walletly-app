class ApiError extends Error {
     constructor(statusCode, message, isOperational = true, stack = '') {
          super(message);
          this.statusCode = statusCode;
          // oprational errors are trusted errors we can handle gracefully
          // e.g., invalid input, not found, etc.
          // whereas programming errors are bugs we should fix
          this.isOperational = isOperational;

          if (stack) {
               this.stack = stack;
          } else {
               Error.captureStackTrace(this, this.constructor);
          }
     }

     // convenience factory methods
     static badRequest(message = 'Bad Request') {
          return new ApiError(400, message);
     }

     static unauthorized(message = 'Unauthorized') {
          return new ApiError(401, message);
     }

     static forbidden(message = 'Forbidden') {
          return new ApiError(403, message);
     }

     static notFound(message = 'Resource not found') {
          return new ApiError(404, message);
     }

     static conflict(message = 'Conflict') {
          return new ApiError(409, message);
     }

     static internal(message = 'Internal Server Error') {
          return new ApiError(500, message);
     }
}

export default ApiError;
