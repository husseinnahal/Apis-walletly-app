import cron from 'node-cron';
import logger from './logger.js';

/**
 * Scheduler utility for managing scheduled jobs
 * Uses node-cron for scheduling tasks
 */

// Store all scheduled tasks for graceful shutdown
const scheduledTasks = new Map();

/**
 * Register a scheduled job
 * @param {string} name - Unique job name
 * @param {string} schedule - Cron expression (e.g., '0 * * * *' for every hour)
 * @param {Function} task - Function to execute
 * @param {Object} options - Additional options (timezone, runOnInit, etc.)
 */
export const registerJob = (name, schedule, task, options = {}) => {
     try {
          // Validate cron expression
          if (!cron.validate(schedule)) {
               throw new Error(`Invalid cron expression: ${schedule}`);
          }

          // Wrap task with error handling and logging
          const wrappedTask = async () => {
               const startTime = Date.now();
               logger.info(`Starting scheduled job: ${name}`);

               try {
                    await task();
                    const duration = Date.now() - startTime;
                    logger.info(`Job completed successfully: ${name}`, { duration: `${duration}ms` });
               } catch (error) {
                    logger.error(`Job failed: ${name}`, {
                         error: error.message,
                         stack: error.stack,
                    });
               }
          };

          // Schedule the task
          const scheduledTask = cron.schedule(schedule, wrappedTask, {
               scheduled: false, // Don't start automatically
               timezone: options.timezone || 'Asia/Beirut',
               ...options,
          });

          // Store reference for shutdown
          scheduledTasks.set(name, {
               task: scheduledTask,
               schedule,
               options,
          });

          logger.info(`Job registered: ${name}`, { schedule, timezone: options.timezone || 'Asia/Beirut' });

          return scheduledTask;
     } catch (error) {
          logger.error(`Failed to register job: ${name}`, {
               error: error.message,
               stack: error.stack,
          });
          throw error;
     }
};

/**
 * Initialize all scheduled jobs
 * @param {Array} jobs - Array of job configurations
 */
export const initializeScheduler = jobs => {
     logger.info('Initializing scheduler...');

     if (!Array.isArray(jobs) || jobs.length === 0) {
          logger.warn('No jobs provided to scheduler');
          return;
     }

     jobs.forEach(job => {
          const { name, schedule, task, options } = job;
          registerJob(name, schedule, task, options);
     });

     // Start all scheduled tasks
     scheduledTasks.forEach((taskInfo, name) => {
          taskInfo.task.start();
          logger.info(`Job started: ${name}`);
     });

     logger.info(`Scheduler initialized with ${scheduledTasks.size} job(s)`);
};

/**
 * Stop all scheduled jobs gracefully
 */
export const stopScheduler = () => {
     logger.info('Stopping all scheduled jobs gracefully...');

     scheduledTasks.forEach((taskInfo, name) => {
          taskInfo.task.stop();
          logger.info(`Job stopped: ${name}`);
     });

     scheduledTasks.clear();
     logger.info('All scheduled jobs stopped');
};

/**
 * Get all registered jobs
 * @returns {Array} List of job names and schedules
 */
export const getRegisteredJobs = () => {
     return Array.from(scheduledTasks.entries()).map(([name, taskInfo]) => ({
          name,
          schedule: taskInfo.schedule,
          timezone: taskInfo.options.timezone || 'Asia/Beirut',
     }));
};

export default {
     registerJob,
     initializeScheduler,
     stopScheduler,
     getRegisteredJobs,
};
