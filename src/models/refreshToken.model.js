import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceInfo: {
      type: String,
      default: 'Unknown Device',
    },
    ip: {
      type: String,
      default: 'Unknown IP',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Date, // Automatically null if active
    },
    replacedByToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual property to check if token is expired
refreshTokenSchema.virtual('isExpired').get(function () {
  return Date.now() >= this.expiresAt;
});

// Virtual property to check if token is active
refreshTokenSchema.virtual('isActive').get(function () {
  return !this.revoked && !this.isExpired;
});

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
