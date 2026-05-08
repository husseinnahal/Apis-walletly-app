import * as gamificationService from '../services/gamification.service.js';

/**
 * GET /api/gamification/profile
 * Returns the full gamification profile (coins, streak, longest streak, milestones)
 */
export const getProfile = async (req, res) => {
  const profile = await gamificationService.getProfile(req.user._id);
  res.status(200).json({
    success: true,
    data: {
      coins: profile.coins,
      lifetimeCoins: profile.lifetimeCoins,
      level: profile.level,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      lastActivityDate: profile.lastActivityDate,
      awardedMilestones: profile.awardedMilestones,
    },
  });
};

/**
 * GET /api/gamification/challenges
 * Returns today's 3 daily challenges (generates them if not yet created)
 */
export const getDailyChallenges = async (req, res) => {
  const result = await gamificationService.getTodayChallenges(req.user._id);
  res.status(200).json({
    success: true,
    data: result,
  });
};

/**
 * GET /api/gamification/leaderboard
 * Returns the leaderboard for the user's current league group
 */
export const getLeaderboard = async (req, res) => {
  const profile = await gamificationService.getProfile(req.user._id);
  
  if (!profile.leagueGroup) {
    return res.status(200).json({ success: true, data: { leaderboard: [] } });
  }

  const leaderboard = await gamificationService.getLeagueLeaderboard(profile.leagueGroup);
  
  res.status(200).json({
    success: true,
    data: {
      level: profile.level,
      month: profile.currentLeagueMonth,
      leaderboard,
    },
  });
};
