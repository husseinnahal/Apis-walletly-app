import Saving from '../models/saving.model.js';
import * as notificationService from '../services/notification.service.js';
import logger from '../utils/logger.js';

/**
 * Savings Deadline Check Job
 * Runs daily to check for saving goals that have reached their deadline.
 */
const savingsDeadlineJob = async () => {
    try {
        const now = new Date();
        logger.info('Starting savings deadline check job', { time: now });

        // Find goals where deadline exists, has passed, and we haven't notified yet
        const expiredGoals = await Saving.find({
            deadline: { $exists: true, $ne: null, $lte: now },
            deadlineNotified: false
        });

        if (expiredGoals.length === 0) {
            logger.info('No saving goals reached deadline today.');
            return;
        }

        logger.info(`Found ${expiredGoals.length} saving goal(s) that reached their deadline.`);

        for (const goal of expiredGoals) {
            const isCompleted = goal.total >= goal.amount;
            
            const title = isCompleted ? 'Goal Deadline Reached!' : 'Goal Deadline Expired';
            const description = isCompleted 
                ? `Congratulations! You reached the deadline for "${goal.title}" and saved the full amount.`
                : `The deadline for "${goal.title}" has passed, but you only saved ${((goal.total/goal.amount)*100).toFixed(1)}% of your goal.`;
            const icon = isCompleted ? '🎊' : '⏰';

            await notificationService.createNotification(goal.userId, {
                title,
                description,
                icon,
                feature: 'saving',
                metadata: { goalId: goal._id }
            });

            // Mark as notified so we don't spam the user every day after
            goal.deadlineNotified = true;
            await goal.save();

            logger.info(`Notified user ${goal.userId} about goal deadline: ${goal.title}`);
        }

        logger.info('Savings deadline check job completed successfully.');
    } catch (error) {
        logger.error('Error during savings deadline check', {
            error: error.message,
            stack: error.stack
        });
    }
};

export default savingsDeadlineJob;
