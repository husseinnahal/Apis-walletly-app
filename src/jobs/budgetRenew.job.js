import Budget from '../models/budgets.model.js';
import logger from '../utils/logger.js';
import * as notificationService from '../services/notification.service.js';

/**
 * Budget Renewal Job
 * Runs periodically to check for budgets that have expired and need to be renewed.
 */

const budgetRenewJob = async () => {
     try {
          const now = new Date();
          logger.info('Starting budget auto-renewal job', { time: now });

          // Find budgets that have passed their endDate, are meant to auto-renew, and are currently active
          const expiredBudgets = await Budget.find({
               endDate: { $lte: now },
               autoRenew: true,
               isActive: true
          });

          if (expiredBudgets.length === 0) {
               logger.info('No budgets need auto-renewal at this time.');
               return;
          }

          logger.info(`Found ${expiredBudgets.length} budget(s) to renew.` );

          for (const budget of expiredBudgets) {
               // Calculate new start and end dates
               const newStartDate = new Date(budget.endDate);
               const newEndDate = new Date(newStartDate);
               
               switch (budget.period) {
                    case 'weekly':
                         newEndDate.setDate(newEndDate.getDate() + 7);
                         break;
                    case 'monthly':
                         newEndDate.setMonth(newEndDate.getMonth() + 1);
                         break;
                    case 'quarterly':
                         newEndDate.setMonth(newEndDate.getMonth() + 3);
                         break;
                    case 'semiannual':
                         newEndDate.setMonth(newEndDate.getMonth() + 6);
                         break;
                    case 'yearly':
                         newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                         break;
                    default:
                         newEndDate.setMonth(newEndDate.getMonth() + 1);
               }

               // Calculate carry-over amount
               let carriedOverAmount = 0;
               if (budget.carryOverEnabled) {
                    const leftover = budget.amount - budget.spent;
                    // Only carry over positive leftovers
                    if (leftover > 0) {
                         carriedOverAmount = leftover;
                    }
               }

               // Update the existing budget for the new period
               budget.startDate = newStartDate;
               budget.endDate = newEndDate;
               budget.spent = 0;
               budget.lastNotifiedThreshold=0;
               budget.carriedOverAmount = carriedOverAmount;
               
               // Keep isActive and autoRenew as they were (true)
               await budget.save();

               // Send notification
               await notificationService.createNotification(budget.user, {
                    title: 'Budget Renewed',
                    description: `Your budget for "${budget.name}" renewed for the new period.`,
                    icon: '🔄',
                    feature: 'budget',
                    metadata: { budgetId: budget._id }
               });

               logger.info(`Successfully renewed budget: ${budget.name} for user: ${budget.user}`);
          }

          logger.info('Budget auto-renewal job completed successfully.');
     } catch (error) {
          logger.error('Error during budget auto-renewal', {
               error: error.message,
               stack: error.stack
          });
          throw error;
     }
};

export default budgetRenewJob;
