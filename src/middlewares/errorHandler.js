/**
 * Centralized error handling middleware
 * Catches all errors, logs them, and returns consistent JSON responses
 * Includes correlation ID for tracing
 * You can customize logging and response based on error type/status
 * but this is a solid default implementation
 */

import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
     let error = err;

     // convert non-ApiError errors to ApiError
     if (!(error instanceof ApiError)) {
          const statusCode = error.statusCode || 500;
          const message = error.message || 'Internal Server Error';
          error = new ApiError(statusCode, message, false, err.stack);
     }

     const { statusCode, message } = error;

     // log error with correlation ID
     const logData = {
          correlationId: req.correlationId,
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          statusCode,
          message,
     };

     if (statusCode >= 500) {
          logger.error('Server error', { ...logData, stack: error.stack });
     } else {
          logger.warn('Client error', logData);
     }

     // prepare error response
     const response = {
          success: false,
          message,
          correlationId: req.correlationId,
          ...(config.env === 'development' && { stack: error.stack }), // include stack trace only in development
     };

     res.status(statusCode).json(response);
};

export default errorHandler;
