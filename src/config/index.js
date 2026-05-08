import dotenv from 'dotenv';

// load environment variables from .env file
dotenv.config();

const config = {
     env: process.env.NODE_ENV || 'development',
     port: parseInt(process.env.PORT, 10) || 3000,
     host: process.env.HOST || 'localhost',

     // logging
     logLevel: process.env.LOG_LEVEL || 'info',

     // rate limiting
     rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
     },

     // cors
     corsOrigin: process.env.CORS_ORIGIN || '*',

     // TODO: add database configuration based on project needs
     // database
     mongodb: {
       uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/express-app',
       dbName: process.env.DB_NAME || 'express-app',
     },

     // JWT
     jwt: {
          accessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
          accessExpire: process.env.JWT_ACCESS_EXPIRE || '15m',
          refreshSecret: process.env.JWT_REFRESH_SECRET || 'refreshSuperSecretKeyChangeThisInProduction',
          refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
     },

     // Cloudinary
     cloudinary: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.CLOUDINARY_API_KEY,
          apiSecret: process.env.CLOUDINARY_API_SECRET,
     },

     // API
     apiVersion: process.env.API_VERSION || 'v1',
};

// validate critical configuration
const validateConfig = () => {
     // TODO: add more validations as needed
     const required = ['port'];
     const missing = required.filter(key => !config[key]);

     if (missing.length > 0) {
          throw new Error(`Missing required configuration: ${missing.join(', ')}`);
     }
};

validateConfig();

export default config;
