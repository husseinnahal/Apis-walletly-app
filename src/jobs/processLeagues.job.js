import { processMonthlyLeagues } from '../services/gamification.service.js';
import logger from '../utils/logger.js';

/**
 * Monthly League Processing Job
 * Runs on the 1st of every month at 00:05.
 * Promotes top 6 users, demotes bottom 10 users in each group of 30.
 * Also resets monthly coins for all users.
 */
const processLeaguesJob = async () => {
    try {
        await processMonthlyLeagues();
        logger.info(`[LeagueJob] Successfully processed monthly leagues.`);
    } catch (error) {
        logger.error(`[LeagueJob] Failed to process leagues: ${error.message}`);
    }
};

export default processLeaguesJob;
