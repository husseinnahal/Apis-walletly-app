import { resetExpiredStreaks } from '../services/gamification.service.js';
import logger from '../utils/logger.js';

/**
 * Streak Reset Job
 * Runs every day at midnight.
 * Finds users who haven't added a transaction in 2+ days and resets their
 * currentStreak back to 0, also clearing their awarded milestones so they
 * can earn them again when they rebuild the streak.
 */
const streakResetJob = async () => {
    try {
        const resetCount = await resetExpiredStreaks();
        logger.info(`[StreakResetJob] Reset streaks for ${resetCount} user(s).`);
    } catch (error) {
        logger.error(`[StreakResetJob] Failed to reset streaks: ${error.message}`);
    }
};

export default streakResetJob;
