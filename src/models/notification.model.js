import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: '🔔',
    },
    feature: {
      type: String,
      enum: ['budget', 'transaction', 'bill', 'saving', 'debt', 'investment', 'challenges', 'chat'],
      required: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed, // To store IDs like budgetId, billId etc.
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries for a user
notificationSchema.index({ user: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
