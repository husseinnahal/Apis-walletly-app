import Budget from '../models/budgets.model.js';
import logger from '../utils/logger.js';

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

               // Create the new budget
               const newBudget = new Budget({
                    user: budget.user,
                    category: budget.category,
                    name: budget.name,
                    note: budget.note,
                    amount: budget.amount, // base amount stays the same
                    spent: 0,
                    period: budget.period,
                    startDate: newStartDate,
                    endDate: newEndDate,
                    autoRenew: true,
                    isActive: true,
                    carryOverEnabled: budget.carryOverEnabled,
                    carriedOverAmount: carriedOverAmount
               });

               // Deactivate the old budget so it becomes history
               budget.isActive = false;
               budget.autoRenew = false;

               // Save both
               await Promise.all([
                    newBudget.save(),
                    budget.save()
               ]);

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
