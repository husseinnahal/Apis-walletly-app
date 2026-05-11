import Debt from '../models/debt.model.js';
import * as notificationService from '../services/notification.service.js';
import logger from '../utils/logger.js';

/**
 * Debt Due Date Check Job
 * Runs daily to check for debts that have reached their due date.
 */
const debtDueDateJob = async () => {
    try {
        const now = new Date();
        logger.info('Starting debt due date check job', { time: now });

        // Find active debts where due date exists, has passed, and we haven't notified yet
        const expiredDebts = await Debt.find({
            status: 'active',
            dueDate: { $exists: true, $ne: null, $lte: now },
            dueDateNotified: false
        });

        if (expiredDebts.length === 0) {
            logger.info('No active debts reached due date today.');
            return;
        }

        logger.info(`Found ${expiredDebts.length} active debt(s) that reached their due date.`);

        for (const debt of expiredDebts) {
            const isCredit = debt.type === 'credit';
            
            const title = isCredit ? 'Credit Payment Due!' : 'Debt Payment Due!';
            const description = isCredit
                ? `The due date for your credit from "${debt.person}" has passed. You still have ${debt.amount - debt.total} remaining to receive.`
                : `The due date for your debt to "${debt.person}" has passed. You still owe ${debt.amount - debt.total} remaining to pay.`;
            const icon = '💸';

            await notificationService.createNotification(debt.userId, {
                title,
                description,
                icon,
                feature: 'debt',
                metadata: { debtId: debt._id }
            });

            // Mark as notified so we don't spam the user every day after
            debt.dueDateNotified = true;
            await debt.save();

            logger.info(`Notified user ${debt.userId} about debt due date to/from: ${debt.person}`);
        }

        logger.info('Debt due date check job completed successfully.');
    } catch (error) {
        logger.error('Error during debt due date check', {
            error: error.message,
            stack: error.stack
        });
    }
};

export default debtDueDateJob;
