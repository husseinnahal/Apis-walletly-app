import { resetExpiredStreaks, sendStreakReminders } from '../services/gamification.service.js';
import logger from '../utils/logger.js';

/**
 * Streak Reset and Reminder Job
 * Runs every day at midnight.
 */
const streakResetJob = async () => {
    try {
        // 1. Send reminders to users inactive for 1 day
        const reminderCount = await sendStreakReminders();
        if (reminderCount > 0) {
            logger.info(`[StreakResetJob] Sent streak reminders to ${reminderCount} user(s).`);
        }

        // 2. Reset streaks for users inactive for 2+ days
        const resetCount = await resetExpiredStreaks();
        if (resetCount > 0) {
            logger.info(`[StreakResetJob] Reset streaks for ${resetCount} user(s).`);
        }
    } catch (error) {
        logger.error(`[StreakResetJob] Failed to reset streaks: ${error.message}`);
    }
};

export default streakResetJob;
