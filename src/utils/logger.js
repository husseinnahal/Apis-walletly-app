/**
 * Structured application logger using Winston
 * Provides different log levels and formats based on environment
 */

import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, errors, printf, colorize, json } = winston.format;

// custom format for development
const devFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
     let msg = `${timestamp} [${level}]: ${message}`;

     // add stack trace for errors
     if (stack) {
          msg += `\n${stack}`;
     }

     // add metadata if present
     if (Object.keys(metadata).length > 0) {
          msg += `\n${JSON.stringify(metadata, null, 2)}`;
     }

     return msg;
});

// create logger instance
const logger = winston.createLogger({
     level: config.logLevel,
     format: combine(
          errors({ stack: true }), // log stack traces
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
     ),
     defaultMeta: { service: 'walletly-backend' },
     transports: [
          // console transport
          new winston.transports.Console({
               format:
                    config.env === 'production'
                         ? json() // JSON format for production
                         : combine(colorize({ all: true }), devFormat), // colored, readable format for development
          }),

          // file transports for production
          ...(config.env === 'production'
               ? [
                    new winston.transports.File({
                         filename: 'logs/error.log',
                         level: 'error',
                         format: json(),
                    }),
                    new winston.transports.File({
                         filename: 'logs/combined.log',
                         format: json(),
                    }),
               ]
               : []),
     ],
});

// handle uncaught exceptions and rejections
logger.exceptions.handle(
     new winston.transports.File({ filename: 'logs/exceptions.log' })
);

logger.rejections.handle(
     new winston.transports.File({ filename: 'logs/rejections.log' })
);

export default logger;
