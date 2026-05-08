import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    spent: {
      type: Number,
      default: 0,
      min: 0,
    },

    period: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'semiannual', 'yearly'],
      default: 'monthly',
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    autoRenew: {
      type: Boolean,
      default: true,
    },


    isActive: {
      type: Boolean,
      default: true,
    },

    // true → use leftover next period / false -> ignore
    carryOverEnabled: {
      type: Boolean,
      default: false
    },
    // how much came from previous budget
    carriedOverAmount: {
      type: Number,
      default: 0,
      min: 0
    }

  },
  {
    timestamps: true,
  }
);


// 🚀 Helpful index (performance)
budgetSchema.index({ user: 1, startDate: 1, endDate: 1 });


const Budget = mongoose.model('Budget', budgetSchema);

export default Budget;








