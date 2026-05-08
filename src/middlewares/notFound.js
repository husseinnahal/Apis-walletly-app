/**
 * 404 Not Found middleware
 * Handles requests to undefined routes
 */

import ApiError from '../utils/ApiError.js';

const notFound = (req, res, next) => {
     next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

export default notFound;
