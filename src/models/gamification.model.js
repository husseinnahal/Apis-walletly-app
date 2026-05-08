import mongoose from 'mongoose';

// ─── Challenge Sub-Schema ─────────────────────────────────────────────────────
const challengeSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'save_small_amount',   // Save a small fixed amount
      'pay_debt_credit',     // Pay an amount to debt/credit
      'add_2_expenses',      // Add 2 expenses
      'add_income',          // Add an income
      'complete_3_actions',  // Complete 3 financial actions
      'pay_bill',            // Pay a bill
      'add_3_transactions',  // Add 3 transactions (income or expense)
    ],
    required: true,
  },

  label: { type: String, required: true },   // Human-readable description
  coins: { type: Number, default: 25 },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },

  // Progress tracking for multi-step challenges
  progress: { type: Number, default: 0 },
  target: { type: Number, default: 1 },

});

// ─── Main Gamification Schema ─────────────────────────────────────────────────
const gamificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    coins: { type: Number, default: 0 },
    lifetimeCoins: { type: Number, default: 0 },

    // ── Leagues ──────────────────────────────────────────────────────────────
    level: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'legend'],
      default: 'bronze',
    },
    leagueGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeagueGroup',
      default: null,
    },
    currentLeagueMonth: {
      type: String,
      default: null,
    },

    // ── Streaks ──────────────────────────────────────────────────────────────
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },

    /** Date of the last day the user added a transaction (date only, no time) */
    lastActivityDate: { type: Date, default: null },

    // ── Daily Challenges ─────────────────────────────────────────────────────
    /** The date these 3 challenges were generated for */
    challengeDate: { type: Date, default: null },
    dailyChallenges: [challengeSchema],

    // ── Milestone tracking (to avoid awarding milestone coins twice) ──────────
    /** List of streak milestones already rewarded, e.g. [7, 14, 30, ...] */
    awardedMilestones: { type: [Number], default: [] },
  },
  { timestamps: true }
);

const Gamification = mongoose.model('Gamification', gamificationSchema);
export default Gamification;
