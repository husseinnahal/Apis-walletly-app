import budgetRenewJob from './budgetRenew.job.js';
import billAutoTasksJob from './billAutoTasks.job.js';
import streakResetJob from './streakReset.job.js';
import processLeaguesJob from './processLeagues.job.js';
import savingsDeadlineJob from './savingsDeadline.job.js';
import debtDueDateJob from './debtDueDate.job.js';

/**
 * Define all scheduled jobs here with their cron schedules
 * 
 */
const jobs = [

     {
          name: 'budget-auto-renew',
          // Run every day at midnight
          schedule: '0 0 * * *',
          task: budgetRenewJob,
          options: {
               timezone: 'Asia/Beirut',
               // runOnInit: true, // Uncomment to test right away
          },
     },
     {
          name: 'bill-auto-tasks',
          // Run every day at midnight
          schedule: '0 0 * * *',
          task: billAutoTasksJob,
          options: {
               timezone: 'Asia/Beirut',
               // runOnInit: true, 
          },
     },
     {
          name: 'streak-reset',
          // Run every day at midnight
          schedule: '0 0 * * *',
          task: streakResetJob,
          options: {
               timezone: 'Asia/Beirut',
               // runOnInit: true,
          },
     },
     {
          name: 'league-monthly-process',
          // Run at 00:05 on the 1st day of every month
          schedule: '5 0 1 * *',
          task: processLeaguesJob,
          options: {
               timezone: 'Asia/Beirut',
               // runOnInit: true,
          },
     },
     {
          name: 'savings-deadline-check',
          // Run every day at midnight
          schedule: '0 0 * * *',
          task: savingsDeadlineJob,
          options: {
               timezone: 'Asia/Beirut',
               // runOnInit: true,
          },
     },
     {
          name: 'debt-due-date-check',
          // Run every day at midnight
          schedule: '0 0 * * *',
          task: debtDueDateJob,
          options: {
               timezone: 'Asia/Beirut',
               // runOnInit: true,
          },
     },
];

export default jobs;
