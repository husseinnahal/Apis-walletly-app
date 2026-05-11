import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    name: {
        type: String,
        required: true,
    },

    amount: {
        type: Number,
        required: true,
    },

    dueDate: {
        type: Date,
        required: true,
    },

    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue', 'cancelled' ],
        default: 'pending'
    },

    isRecurring: {
        type: Boolean,
        default: true,
    },

    recurrence: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly', 'semiannual', 'yearly'],
        default: "monthly",
    },

    notes: {
        type: String,
    },

    // Auto create next bill
    autoRenew: {
      type: Boolean,
      default: true,
    },

    autoPaid: {
      type: Boolean,
      default: true,
    },
    
    autoPayAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
    },

    paymentHistory: [{
        amount: Number,
        date: Date,
        transactionId:
            {
             type: mongoose.Schema.Types.ObjectId,
             ref: 'Transaction' 
            }
    }],

    image: {
        type: String,
    },
    reminderNotified: {
        type: Boolean,
        default: false,
    }

}, { timestamps: true });

export default mongoose.model('Bill', billSchema);