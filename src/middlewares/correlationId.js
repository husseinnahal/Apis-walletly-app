/**
 * Correlation ID middleware
 * Generates or extracts a unique ID for each request to enable request tracing
 * NOTE: this is optional but highly recommended for production applications
 */

import { randomUUID } from 'crypto';

const correlationId = (req, res, next) => {
     // use existing correlation ID from header or generate a new one
     const correlationId =
          req.headers['x-correlation-id'] || req.headers['x-request-id'] || randomUUID();

     // attach to request object for use in controllers/services
     req.correlationId = correlationId;

     // add to response headers for client tracking
     res.setHeader('X-Correlation-ID', correlationId);

     next();
};

export default correlationId;
