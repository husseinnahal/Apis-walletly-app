import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import 'express-async-errors'; // catch async errors automatically

import config from './config/index.js';
import logger from './utils/logger.js';
import correlationId from './middlewares/correlationId.js';
import requestLogger from './middlewares/requestLogger.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import routes from './routes/index.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

// trust proxy (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// security middleware
app.use(helmet());

// cors
app.use(
     cors({
          origin: config.corsOrigin,
          credentials: true,
     })
);

// compression
app.use(compression());

// rate limiting
const limiter = rateLimit({
     windowMs: config.rateLimit.windowMs,
     max: config.rateLimit.maxRequests,
     message: 'Too many requests from this IP, please try again later.',
     standardHeaders: true, // return rate limit info in `RateLimit-*` headers
     legacyHeaders: false, // disable `X-RateLimit-*` headers
});
app.use('/api', limiter);

// body and cookie parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// request correlation ID
app.use(correlationId);

// http request logging
app.use(requestLogger);

// swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// routes
app.use('/', routes);

// 404 handler - must be after all routes
app.use(notFound);

// error handler - must be last
app.use(errorHandler);

// log app initialization
logger.info('Express app initialized', {
     env: config.env,
     nodeVersion: process.version,
});

export default app;
