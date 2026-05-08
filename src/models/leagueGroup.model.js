import mongoose from 'mongoose';

const leagueGroupSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'legend'],
      required: true,
    },
    monthYear: {
      type: String,
      required: true, // e.g., '2026-05'
    },
    memberCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model('LeagueGroup', leagueGroupSchema);
