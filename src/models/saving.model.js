import mongoose from "mongoose";

const SavingGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    title: {
      type: String,
      required: true,
    },
    note: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      default: 0,
    },
    icon: {
      type: String,
      required: true,
    },
    deadline: {
          type: Date,
    },

    savedAmounts: [
      {
        amount: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        transactionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Transaction',
        },
      },
    ],

    deadlineNotified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Saving = mongoose.model("Saving", SavingGoalSchema);

export default Saving;
