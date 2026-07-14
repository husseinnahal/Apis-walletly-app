import mongoose from 'mongoose';
import app from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';
import { initializeScheduler, stopScheduler } from './utils/scheduler.js';
import jobs from './jobs/index.js';
import { initSocket } from './config/socket.js';

let server;

/**
 * Start the server
 */
const startServer = async () => {
     try {
          // Connect to MongoDB
          await mongoose.connect(config.mongodb.uri, {
               dbName: config.mongodb.dbName,
          });
          logger.info('Connected to MongoDB');

          server = app.listen(config.port, config.host, () => {
          initSocket(server);
          logger.info(`Server started successfully`);

          // eslint-disable-next-line no-console
          console.log(`🚀 Server running at http://${config.host}:${config.port}`);
          // eslint-disable-next-line no-console
          console.log(`📚 Health check: http://${config.host}:${config.port}/health`);

          // Initialize scheduler
          try {
               initializeScheduler(jobs);
               // eslint-disable-next-line no-console
               console.log(`⏰ Scheduler initialized with ${jobs.length} job(s)`);
          } catch (error) {
               logger.error('Failed to initialize scheduler', {
                    error: error.message,
                    stack: error.stack,
               });
          }
     });
     } catch (err) {
          logger.error('Failed to start server/connect to DB', { error: err.message });
          process.exit(1);
     }
};
/**
 * Graceful shutdown handler
 */
const gracefulShutdown = signal => {
     logger.info(`${signal} received, closing server gracefully`);

     if (server) {
          server.close(err => {
               if (err) {
                    logger.error('Error during server shutdown', { error: err.message });
                    process.exit(1);
               }

               logger.info('Server closed successfully');

               // Stop all scheduled jobs
               try {
                    stopScheduler();
               } catch (error) {
                    logger.error('Error stopping scheduler', { error: error.message });
               }

               // Close database connections
               if (mongoose.connection.readyState === 1) {
                    mongoose.connection.close(false, () => {
                         logger.info('MongoDB connection closed.');
                    });
               }

               // Close logger transports
               logger.end();

               process.exit(0);
          });

          // Force shutdown after 10 seconds
          setTimeout(() => {
               logger.error('Forcing shutdown after timeout');
               process.exit(1);
          }, 10000);
     } else {
          process.exit(0);
     }
};

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', err => {
     logger.error('Uncaught exception', {
          error: err.message,
          stack: err.stack,
     });
     gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
     logger.error('Unhandled rejection', {
          reason,
          promise,
     });
     gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();
