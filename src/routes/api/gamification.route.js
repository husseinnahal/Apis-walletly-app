import express from 'express';
import { protect } from '../../middlewares/auth.js';
import { getProfile, getDailyChallenges, getLeaderboard } from '../../controllers/gamification.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Gamification
 *   description: Rewards, streaks, and daily financial challenges
 */

router.use(protect);

/**
 * @swagger
 * /api/gamification/profile:
 *   get:
 *     summary: Get user gamification profile (coins, streaks)
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gamification profile data
 */
router.get('/profile', getProfile);

/**
 * @swagger
 * /api/gamification/challenges:
 *   get:
 *     summary: Get today's 3 daily challenges
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of daily challenges
 */
router.get('/challenges', getDailyChallenges);

/**
 * @swagger
 * /api/gamification/leaderboard:
 *   get:
 *     summary: Get the current global leaderboard
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leaderboard data
 */
router.get('/leaderboard', getLeaderboard);

export default router;
