import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required:true
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    initialBalance: {
        type: Number,
        required: true,
        default:0,
    },

    totalBalance: {
        type: Number,
        default:0
    },

  },
  {
    timestamps: true,
  }
);

// Ensure a user cannot have two account with exactly the same name for themselves
AccountSchema.index({ name: 1, user: 1 }, { unique: true });

const Account = mongoose.model('Account', AccountSchema);

export default Account;
