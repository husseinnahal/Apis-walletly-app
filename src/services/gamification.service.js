import Gamification from '../models/gamification.model.js';
import LeagueGroup from '../models/leagueGroup.model.js';
import * as notificationService from './notification.service.js';

const LEVELS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'legend'];

// ─── Constants ────────────────────────────────────────────────────────────────
const COINS = {
  PER_TRANSACTION: 10,
  PER_STREAK_DAY: 20,
  CHALLENGE_COMPLETE: 25,
};

/** Streak milestones → bonus coins awarded once per milestone */
const STREAK_MILESTONES = [
  { days: 7,   bonus: 30  },
  { days: 14,  bonus: 50  },
  { days: 30,  bonus: 70  },
  { days: 60,  bonus: 100 },
  { days: 100, bonus: 150 },
  { days: 365, bonus: 250 },
];

/** All possible challenge  3 are picked randomly each day. */
const CHALLENGE_POOL = [
  {
    type: 'save_small_amount',
    label: 'Save an amount today',
    target: 1,
    // targetAmount will be set randomly at generation time ($2–$5 in USD)
  },
  {
    type: 'pay_debt_credit',
    label: 'Make a payment towards a debt or credit',
    target: 1,
  },
  {
    type: 'add_2_expenses',
    label: 'Add 2 expense transactions',
    target: 2,
  },
  {
    type: 'add_income',
    label: 'Add an income transaction',
    target: 1,
  },
  {
    type: 'complete_3_actions',
    label: 'Complete 3 financial actions',
    target: 3,
  },
  {
    type: 'pay_bill',
    label: 'Pay a bill today',
    target: 1,
  },
  {
    type: 'add_3_transactions',
    label: 'Add 3 transactions (income or expense)',
    target: 3,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a UTC date string "YYYY-MM-DD" for the given Date (default: now) */
const toDateStr = (d = new Date()) =>
  d.toISOString().split('T')[0];

/** Pick `n` unique random items from an array */
const pickRandom = (arr, n) => {
  const copy = [...arr];
  const result = [];
  while (result.length < n && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
};

// ─── Core: get-or-create the gamification doc for a user ─────────────────────
export const getOrCreate = async (userId) => {
  let doc = await Gamification.findOne({ user: userId });
  if (!doc) {
    doc = await Gamification.create({ user: userId });
  }

  // Handle League Assignment for the current month
  const currentMonthYear = new Date().toISOString().slice(0, 7);
  if (doc.currentLeagueMonth !== currentMonthYear) {
    doc.coins = 0; // Reset monthly coins for the new competition
    doc.currentLeagueMonth = currentMonthYear;
    
    // Find an open group for this level and month
    let group = await LeagueGroup.findOneAndUpdate(
      { level: doc.level || 'bronze', monthYear: currentMonthYear, memberCount: { $lt: 30 } },
      { $inc: { memberCount: 1 } },
      { new: true }
    );
    
    if (!group) {
      group = await LeagueGroup.create({
        level: doc.level || 'bronze',
        monthYear: currentMonthYear,
        memberCount: 1
      });
    }
    
    doc.leagueGroup = group._id;
    await doc.save();
  }

  return doc;
};


// ─── Streak Logic ─────────────────────────────────────────────────────────────
/**
 * Called whenever the user performs a qualifying action (transaction added).
 * Updates the streak, awards streak coins + milestone bonus if applicable,
 * and awards per-transaction coins.
 *
 * Returns the updated gamification doc + a summary of what was earned.
 */
export const recordActivity = async (userId) => {
  const doc = await getOrCreate(userId);
  const todayStr = toDateStr();
  const lastStr  = doc.lastActivityDate ? toDateStr(doc.lastActivityDate) : null;

  let coinsEarned = COINS.PER_TRANSACTION;
  const rewards = [];
  let streakUpdated = false;

  rewards.push({ reason: 'Transaction added', coins: COINS.PER_TRANSACTION });

  if (lastStr === todayStr) {
    // Already recorded activity today — only give transaction coins, no new streak
  } else {
    // Check if yesterday or the day before (1 day off) was the last activity
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toDateStr(yesterday);

    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    const dayBeforeYesterdayStr = toDateStr(dayBeforeYesterday);

    if (!lastStr || lastStr === yesterdayStr || lastStr === dayBeforeYesterdayStr) {
      // Extend streak (allowed 1 day off)
      doc.currentStreak += 1;
      streakUpdated = true;
    } else {
      // Gap of 2+ days → reset streak to 0 (starting a new streak today)
      doc.currentStreak  = 0;
      doc.awardedMilestones = []; // reset milestone tracking
      streakUpdated = true;
    }

    // Update longest streak
    if (doc.currentStreak > doc.longestStreak) {
      doc.longestStreak = doc.currentStreak;
    }

    // Award daily streak coins
    coinsEarned += COINS.PER_STREAK_DAY;
    rewards.push({ reason: `${doc.currentStreak}-day streak`, coins: COINS.PER_STREAK_DAY });

    // Check milestone bonuses
    for (const milestone of STREAK_MILESTONES) {
      if (
        doc.currentStreak >= milestone.days &&
        !doc.awardedMilestones.includes(milestone.days)
      ) {
        coinsEarned += milestone.bonus;
        doc.awardedMilestones.push(milestone.days);
        rewards.push({
          reason: `🏆 ${milestone.days}-day streak milestone!`,
          coins: milestone.bonus,
        });
      }
    }

    doc.lastActivityDate = new Date();
  }

  doc.coins += coinsEarned;
  if (doc.lifetimeCoins !== undefined) doc.lifetimeCoins += coinsEarned;
  doc.streakReminderSent = false; // Reset reminder flag
  await doc.save();

  return {
    coins: doc.coins,
    coinsEarned,
    currentStreak: doc.currentStreak,
    longestStreak: doc.longestStreak,
    streakUpdated,
    rewards,
  };
};


// ─── Daily Challenge Management ───────────────────────────────────────────────
/**
 * Returns today's 3 challenges for the user.
 * Generates new ones if they don't have any for today.
 */
export const getTodayChallenges = async (userId) => {
  const doc = await getOrCreate(userId);
  const todayStr = toDateStr();
  const challengeDateStr = doc.challengeDate ? toDateStr(doc.challengeDate) : null;

  if (challengeDateStr !== todayStr) {
    // Generate new daily challenges
    const picked = pickRandom(CHALLENGE_POOL, 3);
    doc.dailyChallenges = picked.map((c) => {
      const entry = {
        type: c.type,
        label: c.label,
        coins: COINS.CHALLENGE_COMPLETE,
        completed: false,
        progress: 0,
        target: c.target,
      };

      return entry;
    });
    doc.challengeDate = new Date();
    await doc.save();
  }

  return {
    date: toDateStr(),
    challenges: doc.dailyChallenges,
    coins: doc.coins,
  };
};


/**
 * Advances progress on a challenge by `increment` and awards coins if complete.
 * `challengeType` — one of the type strings in CHALLENGE_POOL
 * `increment`    — how much to add to progress (default 1)
 *
 * Returns { completed, coinsEarned, challenge }
 */
export const progressChallenge = async (userId, challengeType, increment = 1) => {
  const doc = await getOrCreate(userId);
  const todayStr = toDateStr();
  const challengeDateStr = doc.challengeDate ? toDateStr(doc.challengeDate) : null;

  // If challenges are stale, re-generate first
  if (challengeDateStr !== todayStr) {
    await getTodayChallenges(userId);
    // Re-fetch
    return progressChallenge(userId, challengeType, increment);
  }

  const challenge = doc.dailyChallenges.find(
    (c) => c.type === challengeType && !c.completed
  );

  if (!challenge) {
    // No matching incomplete challenge today
    return { completed: false, coinsEarned: 0, challenge: null };
  }

  let coinsEarned = 0;
  let justCompleted = false;


    challenge.progress = Math.min(challenge.progress + increment, challenge.target);
    if (challenge.progress >= challenge.target && !challenge.completed) {
      challenge.completed = true;
      challenge.completedAt = new Date();
      coinsEarned = COINS.CHALLENGE_COMPLETE;
      justCompleted = true;
    }
  

  doc.coins += coinsEarned;
  if (doc.lifetimeCoins !== undefined) doc.lifetimeCoins += coinsEarned;
  await doc.save();

  return {
    completed: justCompleted,
    coinsEarned,
    challenge,
    totalCoins: doc.coins,
  };
};

/**
 * Advances progress on multiple challenges at once.
 * `updates` — Array of objects: { type: 'challenge_type', increment: 1 }
 * This is highly optimized (1 DB read, 1 DB write).
 */
export const progressMultipleChallenges = async (userId, updates) => {
  const doc = await getOrCreate(userId);
  const todayStr = toDateStr();
  const challengeDateStr = doc.challengeDate ? toDateStr(doc.challengeDate) : null;

  // If challenges are stale, re-generate first
  if (challengeDateStr !== todayStr) {
    await getTodayChallenges(userId);
    return progressMultipleChallenges(userId, updates);
  }

  let totalCoinsEarned = 0;
  let hasUpdates = false;

  for (const update of updates) {
    const challenge = doc.dailyChallenges.find(
      (c) => c.type === update.type && !c.completed
    );

    if (!challenge) continue;

    hasUpdates = true;
    const increment = update.increment || 1;
    challenge.progress = Math.min(challenge.progress + increment, challenge.target);
    
    if (challenge.progress >= challenge.target && !challenge.completed) {
      challenge.completed = true;
      challenge.completedAt = new Date();
      totalCoinsEarned += COINS.CHALLENGE_COMPLETE;
    }
  }

  if (hasUpdates) {
    doc.coins += totalCoinsEarned;
    if (doc.lifetimeCoins !== undefined) doc.lifetimeCoins += totalCoinsEarned;
    await doc.save();
  }

  return { totalCoinsEarned, totalCoins: doc.coins };
};



// ─── Getters ──────────────────────────────────────────────────────────────────
/** Full gamification profile for a user */
export const getProfile = async (userId) => {
  const doc = await getOrCreate(userId);
  return doc;
};

/** Streak reset job: called by cron — resets streaks for users inactive 2+ days */
export const resetExpiredStreaks = async () => {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  // midnight of two days ago
  twoDaysAgo.setHours(0, 0, 0, 0);

  const filter = {
    currentStreak: { $gt: 0 },
    $or: [
      { lastActivityDate: { $lt: twoDaysAgo } },
      { lastActivityDate: null },
    ],
  };

  const usersToReset = await Gamification.find(filter);

  if (usersToReset.length > 0) {
    for (const doc of usersToReset) {
      await notificationService.createNotification(doc.user, {
        title: 'Streak Lost',
        description: `Your ${doc.currentStreak}-day streak has ended due to inactivity. Start a new one today!`,
        icon: '🔥',
        feature: 'challenges'
      });
    }

    const result = await Gamification.updateMany(filter, {
      $set: { currentStreak: 0, awardedMilestones: [] },
    });
    return result.modifiedCount;
  }

  return 0;
};

/** 
 * Streak reminder job: called by cron 
 * Reminds users who haven't been active today but were active yesterday.
 */
export const sendStreakReminders = async () => {
  const startOfYesterday = new Date();
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  startOfYesterday.setHours(0, 0, 0, 0);

  const startOfTwoDaysAgo = new Date();
  startOfTwoDaysAgo.setDate(startOfTwoDaysAgo.getDate() - 2);
  startOfTwoDaysAgo.setHours(0, 0, 0, 0);

  // Users active the day before yesterday, but NOT active yesterday (last chance today!)
  const filter = {
    currentStreak: { $gt: 0 },
    lastActivityDate: { $lt: startOfYesterday, $gte: startOfTwoDaysAgo },
    streakReminderSent: false
  };

  const usersToRemind = await Gamification.find(filter);

  if (usersToRemind.length > 0) {
    for (const doc of usersToRemind) {
      await notificationService.createNotification(doc.user, {
        title: 'Keep your streak alive!',
        description: `Keep your ${doc.currentStreak}-day streak going!`,
        icon: '🔥',
        feature: 'challenges'
      });
      doc.streakReminderSent = true;
      await doc.save();
    }
    return usersToRemind.length;
  }

  return 0;
};

// ─── Leagues ──────────────────────────────────────────────────────────────────

export const getLeagueLeaderboard = async (groupId) => {
  if (!groupId) return [];
  const members = await Gamification.find({ leagueGroup: groupId })
    .populate('user', 'username avatar')
    .sort({ coins: -1 })
    .select('user coins level lifetimeCoins');

  return members.map((m, index) => ({
    rank: index + 1,
    user: m.user,
    coins: m.coins,
    level: m.level,
    lifetimeCoins: m.lifetimeCoins,
  }));
};

export const processMonthlyLeagues = async () => {
  const now = new Date();
  // Safe way to get the previous month string: subtract 15 days
  const lastMonthDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const monthYear = lastMonthDate.toISOString().slice(0, 7);

  const groups = await LeagueGroup.find({ monthYear });

  for (const group of groups) {
    const members = await Gamification.find({ leagueGroup: group._id }).sort({ coins: -1 });

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const currentLevelIdx = LEVELS.indexOf(member.level || 'bronze');
      let newLevelIdx = currentLevelIdx;

      if (i < 6) { 
        // Top 6 -> Promote
        newLevelIdx = Math.min(LEVELS.length - 1, currentLevelIdx + 1);
      } else if (i >= 20) { 
        // Bottom 10 (index 20+) -> Demote
        newLevelIdx = Math.max(0, currentLevelIdx - 1);
      }

      const newLevel = LEVELS[newLevelIdx];

      let title = 'League Competition Results';
      let description = '';
      let icon = '🏅';

      if (newLevelIdx > currentLevelIdx) {
        title = 'League Promotion! 🏆';
        description = `Congratulations! You've been promoted to the ${newLevel.toUpperCase()} league.`;
        icon = '🏅';
      } else if (newLevelIdx < currentLevelIdx) {
        title = 'League Demotion';
        description = `You've been moved down to the ${newLevel.toUpperCase()} league.`;
        icon = '📉';
      } else {
        description = `You've maintained your position in the ${newLevel.toUpperCase()} league.`;
        icon = '🏆';
      }

      // Send the Renewal notification
      await notificationService.createNotification(member.user, {
        title: 'League Renewed! 🔄',
        description: 'The competition month has ended and the leagues have been renewed for the new month.',
        icon: '🔄',
        feature: 'challenges'
      });

      // Send the Result notification
      await notificationService.createNotification(member.user, {
        title,
        description,
        icon,
        feature: 'challenges'
      });

      member.level = LEVELS[newLevelIdx];
      member.coins = 0;
      member.currentLeagueMonth = null;
      member.leagueGroup = null;
      await member.save();
    }
  }
};
