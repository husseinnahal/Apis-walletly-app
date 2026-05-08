# Scheduler Documentation

## Overview

This project uses **node-cron** for scheduling recurring tasks. The scheduler is integrated with Winston logger for comprehensive job tracking and includes proper error handling and graceful shutdown support.

## Key Features

- ✅ Simple cron syntax for flexible scheduling
- ✅ Centralized job management
- ✅ Automatic error handling with logging
- ✅ Graceful shutdown of all jobs
- ✅ Timezone support
- ✅ Job execution tracking

## Directory Structure

```
src/
├── utils/
│   └── scheduler.js          # Scheduler utility with job management
├── jobs/
│   ├── index.js              # Job registry
│   └── example.job.js        # Example cleanup job
└── index.js                  # Scheduler initialization
```

## Cron Expression Format

Node-cron uses the standard cron format:

```
┌────────────── second (optional, 0-59)
│ ┌──────────── minute (0-59)
│ │ ┌────────── hour (0-23)
│ │ │ ┌──────── day of month (1-31)
│ │ │ │ ┌────── month (1-12 or names)
│ │ │ │ │ ┌──── day of week (0-7 or names, 0 and 7 are Sunday)
│ │ │ │ │ │
* * * * * *
```

### Common Examples

| Pattern | Description |
|---------|-------------|
| `0 * * * *` | Every hour at minute 0 |
| `30 2 * * *` | Every day at 2:30 AM |
| `0 0 * * 0` | Every Sunday at midnight |
| `0 0 1 * *` | First day of every month at midnight |
| `*/15 * * * *` | Every 15 minutes |
| `0 9-17 * * 1-5` | Every hour from 9 AM to 5 PM, Monday to Friday |
| `*/1 * * * *` | Every minute (for testing) |
| `0 */6 * * *` | Every 6 hours |

### Special Characters

- `*` - Any value
- `,` - List of values (e.g., `1,3,5`)
- `-` - Range of values (e.g., `1-5`)
- `/` - Step values (e.g., `*/15` means every 15 units)

## Creating New Jobs

### Step 1: Create Job File

Create a new file in `src/jobs/` directory (e.g., `report.job.js`):

```javascript
import logger from '../utils/logger.js';

/**
 * Generate weekly report job
 * Runs every Monday at 8:00 AM
 */
const generateWeeklyReport = async () => {
     try {
          logger.info('Generating weekly report...');

          // Your business logic here
          // Example: Query database, generate PDF, send email
          
          // Simulate work
          await processReportData();
          await sendEmailNotification();

          logger.info('Weekly report generated successfully');
     } catch (error) {
          // Error will be automatically logged by scheduler
          // Re-throw to let scheduler handle it
          throw error;
     }
};

const processReportData = async () => {
     // Implementation
};

const sendEmailNotification = async () => {
     // Implementation
};

export default generateWeeklyReport;
```

### Step 2: Register Job

Add your job to `src/jobs/index.js`:

```javascript
import cleanupJob from './example.job.js';
import generateWeeklyReport from './report.job.js'; // Import your job

const jobs = [
     {
          name: 'cleanup-job',
          schedule: '0 2 * * *', // 2:00 AM daily
          task: cleanupJob,
          options: {
               timezone: 'Africa/Cairo',
          },
     },
     {
          name: 'weekly-report',
          schedule: '0 8 * * 1', // 8:00 AM every Monday
          task: generateWeeklyReport,
          options: {
               timezone: 'Africa/Cairo',
               // runOnInit: true, // Uncomment to run on startup
          },
     },
];

export default jobs;
```

### Step 3: Restart Server

The scheduler will automatically initialize your new job on server startup.

## Job Options

Jobs support the following options:

```javascript
{
     name: 'job-name',           // Required: Unique identifier
     schedule: '0 * * * *',      // Required: Cron expression
     task: myFunction,           // Required: Async function to execute
     options: {
          timezone: 'Africa/Cairo',  // Optional: Timezone (default: Africa/Cairo)
          runOnInit: false,          // Optional: Run immediately on startup
     }
}
```

## Best Practices

### 1. Error Handling

Always wrap your job logic in try-catch and re-throw errors:

```javascript
const myJob = async () => {
     try {
          // Your logic here
          await doSomething();
     } catch (error) {
          // Log specific context if needed
          logger.error('Specific error context', { error: error.message });
          // Re-throw so scheduler can track it
          throw error;
     }
};
```

### 2. Logging

Use structured logging for better observability:

```javascript
logger.info('Job starting', { jobName: 'cleanup', params: { days: 30 } });
logger.info('Job completed', { jobName: 'cleanup', itemsProcessed: 150 });
```

### 3. Idempotency

Make jobs idempotent (safe to run multiple times):

```javascript
// Good: Check before processing
const processNewOrders = async () => {
     const unprocessedOrders = await db.orders.find({ status: 'new' });
     // Process only unprocessed orders
};

// Bad: Assumes state
const processOrders = async () => {
     const orders = await db.orders.findAll();
     // Processes all orders every time
};
```

### 4. Database Operations

Use transactions for data consistency:

```javascript
const cleanupExpiredSessions = async () => {
     const session = await db.startSession();
     try {
          await session.withTransaction(async () => {
               await db.sessions.deleteMany({ 
                    expiresAt: { $lt: new Date() } 
               });
          });
     } finally {
          await session.endSession();
     }
};
```

### 5. Resource Management

Clean up resources properly:

```javascript
const syncExternalData = async () => {
     let connection;
     try {
          connection = await externalAPI.connect();
          await connection.sync();
     } finally {
          if (connection) {
               await connection.close();
          }
     }
};
```

### 6. Long-Running Jobs

For long-running jobs, add heartbeat logging:

```javascript
const processLargeDataset = async () => {
     const batches = await getBatches();
     
     for (let i = 0; i < batches.length; i++) {
          await processBatch(batches[i]);
          
          // Log progress every 10 batches
          if (i % 10 === 0) {
               logger.info(`Progress: ${i}/${batches.length} batches processed`);
          }
     }
};
```

## Common Use Cases

### 1. Database Cleanup

```javascript
// Clean old logs daily at 3 AM
{
     name: 'cleanup-old-logs',
     schedule: '0 3 * * *',
     task: async () => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 30);
          await db.logs.deleteMany({ createdAt: { $lt: cutoff } });
     }
}
```

### 2. Report Generation

```javascript
// Generate daily summary at midnight
{
     name: 'daily-summary',
     schedule: '0 0 * * *',
     task: async () => {
          const summary = await generateDailySummary();
          await sendEmail(summary);
     }
}
```

### 3. Data Synchronization

```javascript
// Sync with external API every 15 minutes
{
     name: 'external-sync',
     schedule: '*/15 * * * *',
     task: async () => {
          const data = await externalAPI.fetch();
          await db.cache.updateMany(data);
     }
}
```

### 4. Cache Warming

```javascript
// Warm cache every hour
{
     name: 'cache-warming',
     schedule: '0 * * * *',
     task: async () => {
          const popularItems = await db.items.find().sort({ views: -1 }).limit(100);
          await cache.setMany(popularItems);
     }
}
```

### 5. Sending Notifications

```javascript
// Send daily digest at 9 AM
{
     name: 'daily-digest',
     schedule: '0 9 * * *',
     task: async () => {
          const users = await db.users.find({ emailPrefs: 'daily' });
          await Promise.all(users.map(user => sendDigest(user)));
     }
}
```

## Testing Scheduled Jobs

### Manual Testing

For testing, temporarily change the schedule to run frequently:

```javascript
// Development testing
{
     name: 'test-job',
     schedule: '*/1 * * * *', // Every minute
     task: myJob,
     options: {
          runOnInit: true, // Run immediately
     }
}
```

### Automated Testing

See `src/tests/scheduler.test.js` for examples of testing scheduled jobs with Jest.

```javascript
import { initializeScheduler, stopScheduler } from '../utils/scheduler.js';

describe('Scheduler', () => {
     afterEach(async () => {
          await stopScheduler();
     });

     it('should execute job on schedule', async () => {
          const mockJob = jest.fn();
          const jobs = [{
               name: 'test-job',
               schedule: '*/1 * * * *',
               task: mockJob,
          }];

          initializeScheduler(jobs);
          
          // Wait for job execution
          await new Promise(resolve => setTimeout(resolve, 61000));
          
          expect(mockJob).toHaveBeenCalled();
     });
});
```

## Troubleshooting

### Jobs Not Running

1. **Check cron expression**: Use [crontab.guru](https://crontab.guru/) to validate
2. **Check timezone**: Ensure timezone is set correctly
3. **Check logs**: Look for initialization errors in Winston logs
4. **Verify job is registered**: Check startup logs for "Scheduler initialized with X job(s)"

### Jobs Failing Silently

1. **Check error logs**: Errors are logged with the job name
2. **Add try-catch**: Ensure errors are being thrown, not swallowed
3. **Test job independently**: Run the job function directly to debug

### Memory Leaks

1. **Clean up resources**: Close connections, clear intervals
2. **Monitor memory**: Use process monitoring tools
3. **Limit concurrency**: Don't run too many jobs simultaneously

## Monitoring

### Logging

All job executions are automatically logged:

```
INFO: Starting scheduled job: cleanup-job
INFO: Job completed successfully: cleanup-job { duration: '245ms' }
```

Errors are also logged:

```
ERROR: Job failed: cleanup-job { error: 'Connection timeout', stack: '...' }
```

### Recommended Monitoring

For production, consider:

1. **External monitoring** (e.g., Datadog, New Relic)
2. **Alert on job failures**
3. **Track job execution duration**
4. **Monitor job success rate**

## Graceful Shutdown

The scheduler automatically stops all jobs during server shutdown:

```
INFO: SIGTERM received, closing server gracefully
INFO: Stopping all scheduled jobs gracefully...
INFO: Job stopped: cleanup-job
INFO: All scheduled jobs stopped
```

## Timezone Support

Jobs support timezone configuration:

```javascript
{
     name: 'us-report',
     schedule: '0 9 * * *', // 9 AM
     task: generateReport,
     options: {
          timezone: 'America/New_York',
     }
}
```

Common timezones:
- `Africa/Cairo`
- `America/New_York`
- `Europe/London`
- `Asia/Tokyo`
- `UTC`

See [IANA timezone database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) for all options.

## API Reference

### `initializeScheduler(jobs)`

Initialize and start all scheduled jobs.

**Parameters:**
- `jobs` (Array): Array of job configuration objects

**Example:**
```javascript
import { initializeScheduler } from './utils/scheduler.js';
import jobs from './jobs/index.js';

initializeScheduler(jobs);
```

### `stopScheduler()`

Stop all running scheduled jobs gracefully.

**Example:**
```javascript
import { stopScheduler } from './utils/scheduler.js';

process.on('SIGTERM', () => {
     stopScheduler();
});
```

### `registerJob(name, schedule, task, options)`

Register a single job (used internally by `initializeScheduler`).

**Parameters:**
- `name` (string): Unique job identifier
- `schedule` (string): Cron expression
- `task` (Function): Async function to execute
- `options` (Object): Additional options

### `getRegisteredJobs()`

Get list of all registered jobs.

**Returns:** Array of job information

**Example:**
```javascript
import { getRegisteredJobs } from './utils/scheduler.js';

const jobs = getRegisteredJobs();
console.log(jobs);
// [{ name: 'cleanup-job', schedule: '0 2 * * *', timezone: 'Africa/Cairo' }]
```

## Additional Resources

- [node-cron GitHub](https://github.com/node-cron/node-cron)
- [Crontab Guru](https://crontab.guru/) - Cron expression tester
- [IANA Timezone Database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
