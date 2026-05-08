import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/users.model.js';
import ApiError from './../utils/ApiError.js';

export const protect = async (req, res, next) => {
     let token;

     if (
          req.headers.authorization &&
          req.headers.authorization.startsWith('Bearer')
     ) {
          // Set token from Bearer token in header
          token = req.headers.authorization.split(' ')[1];
     }

     // Make sure token exists
     if (!token) {
          throw ApiError.unauthorized('Not authorized to access this route');
     }

     try {
          // Verify token
          const decoded = jwt.verify(token, config.jwt.accessSecret);

          // Find the user and attach to request
          const user = await User.findById(decoded.id);
          
          if (!user) {
               throw ApiError.unauthorized('Not authorized to access this route');
          }

          req.user = user;
          next();
     } catch (err) {
          throw ApiError.unauthorized('Not authorized to access this route');
     }
};

/**
 * Ensures the logged-in user has the admin role.
 * MUST be used after the `protect` middleware!
 */
export const authorizeAdmin = (req, res, next) => {
     if (!req.user || req.user.role !== 'admin') {
          throw ApiError.forbidden('You do not have permission to perform this action');
     }
     next();
};
