/**
 * HTTP Request logging middleware
 * Uses Morgan for HTTP request logging, integrates with Winston
 */

import morgan from 'morgan';
import logger from '../utils/logger.js';
import config from '../config/index.js';

// Create a stream object that writes to Winston
const stream = {
     write: message => {
          logger.info(message.trim());
     },
};

// Custom token for correlation ID
morgan.token('correlation-id', req => req.correlationId);

// Different formats based on environment
const format =
     config.env === 'production'
          ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms - :correlation-id'
          : ':method :url :status :response-time ms - :correlation-id';

const requestLogger = morgan(format, { stream });

export default requestLogger;
