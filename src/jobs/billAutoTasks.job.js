import Bill from '../models/bills.model.js';
import { markBillAsPaid } from '../services/bill.service.js';

/**
 * Daily job to process bills:
 * 1. Mark pending bills that passed their due date as 'overdue'
 * 2. Automatically process payments for bills with autoPaid = true
 */
const billAutoTasksJob = async () => {
    try {
        const now = new Date();

        // 1. Process Overdue Bills
        // Find bills that are pending, past their due date, and NOT auto-paid
        const overdueBills = await Bill.find({
            status: 'pending',
            dueDate: { $lt: now },
            autoPaid: false
        });

        if (overdueBills.length > 0) {
            for (const bill of overdueBills) {
                bill.status = 'overdue';
                await bill.save();
            }
        }

        // 2. Process Auto-Paid Bills
        // Find bills that are due, and have autoPaid enabled.
        // We check both pending and overdue in case a previous job run failed.
        const autoPayBills = await Bill.find({
            status: { $in: ['pending', 'overdue'] },
            dueDate: { $lte: now },
            autoPaid: true
        });

        if (autoPayBills.length > 0) {
            for (const bill of autoPayBills) {
                try {
                    // Reusing the robust service function
                    // This creates the transaction, logs the history, and sets the next due date
                    await markBillAsPaid(bill.userId, bill._id, { 
                        date: now,
                        accountId: bill.autoPayAccountId
                    });
                } catch (err) {
                    console.error(`[CRON] Failed to auto-pay bill ${bill._id}:`, err.message);
                }
            }
        }

    } catch (error) {
        console.error('[CRON] Error running bill auto tasks job:', error);
    }
};

export default billAutoTasksJob;
