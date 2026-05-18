import axios from 'axios';
import Bill from '../models/bills.model.js';
import Category from '../models/categories.model.js';
import ApiError from '../utils/ApiError.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';
import * as transactionService from './transactions.service.js';
import * as gamificationService from './gamification.service.js';

/**
 * Helper to handle base64 image upload to Cloudinary
 */
const handleImageUpload = async (base64String, folder = 'bills') => {
    if (!base64String || !base64String.startsWith('data:image')) {
        return base64String; // Return as is if already a URL or empty
    }

    try {
        // Remove the data:image/xxx;base64, part
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const result = await uploadImageToCloudinary(buffer, folder);
        return result.secure_url;
    } catch (error) {
        throw ApiError.internal('Failed to upload image to cloud storage');
    }
};

const convertToUSD = async (amount, currency) => {
    if (!currency || currency === 'USD') {
        return amount;
    }

    try {
        const response = await axios.get(`https://open.er-api.com/v6/latest/USD`);
        const rates = response.data.rates;

        if (!rates[currency]) {
            throw ApiError.badRequest(`Invalid currency: ${currency}`);
        }

        // Convert amount to USD
        const rate = rates[currency];
        const amountInUSD = amount / rate;

        if (Number(amountInUSD) <= 0) {
            throw ApiError.badRequest('The amount is too small');
        }

        return Number(amountInUSD);
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw ApiError.internal('Failed to fetch exchange rates');
    }
};

/**
 * Helper to calculate next due date based on recurrence
 */
const calculateNextDueDate = (currentDate, recurrence) => {
    const date = new Date(currentDate);
    switch (recurrence) {
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            break;
        case 'semiannual':
            date.setMonth(date.getMonth() + 6);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            break;
    }
    return date;
};

export const createBill = async (userId, billData) => {
    const billExist = await Bill.findOne({ name: billData.name.trim(), userId });
        if (billExist) {
            throw ApiError.notFound('Bill with this name  already exists');
        }
    const currency = billData.currency || 'USD';
    const amountInUSD = await convertToUSD(billData.amount, currency);

    // Handle Cloudinary Image Upload
    let imageUrl = '';
    if (billData.image) {
        imageUrl = await handleImageUpload(billData.image);
    }

    const bill = await Bill.create({
        ...billData,
        userId,
        amount: amountInUSD,
        image: imageUrl
    });
    return bill;
};

export const getBills = async (userId, filters = {}) => {
    const query = { userId };
    
    if (filters.status) query.status = filters.status;
    if (filters.recurrence) query.recurrence = filters.recurrence;
    if (filters.name && filters.name.trim() !== '') {
        query.name = { 
            $regex: filters.name, 
            $options: 'i' 
        };
    }
    const bills = await Bill.find(query)
        .sort({ dueDate: 1 })
        .populate({
            path: 'paymentHistory.transactionId',
            select: 'account'
        });
    
    // 1. Custom Priority Sorting (overdue > pending > paid > cancelled)
    const statusPriority = {
        'overdue': 1,
        'pending': 2,
        'paid': 3,
        'cancelled': 4
    };

    const sortedBills = bills.sort((a, b) => {
        const diff = (statusPriority[a.status] || 5) - (statusPriority[b.status] || 5);
        if (diff !== 0) return diff;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    // 2. Split into Upcoming (within 7 days) and Others
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const thirtyDays = new Date();
    thirtyDays.setDate(now.getDate() + 30);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
        spentThisMonth: 0,
        overdueCount: 0,
        projected30Days: 0
    };

    const upcoming = [];
    const others = [];

    sortedBills.forEach(bill => {
        const dueDate = new Date(bill.dueDate);
        
        // Count Overdue
        if (bill.status === 'overdue') stats.overdueCount++;

        // Calculate Spent This Month (from payment history)
        if (bill.paymentHistory) {
            bill.paymentHistory.forEach(payment => {
                if (new Date(payment.date) >= startOfMonth) {
                    stats.spentThisMonth += payment.amount || 0;
                }
            });
        }

        // Calculate Projected (Pending/Overdue in next 30 days)
        if (bill.status !== 'paid' && bill.status !== 'cancelled' && dueDate <= thirtyDays) {
            stats.projected30Days += bill.amount || 0;
        }

        // Split lists
        if (bill.status === 'pending' && dueDate >= now && dueDate <= nextWeek) {
            upcoming.push(bill);
        } else {
            others.push(bill);
        }
    });

    return { upcoming, others, stats };
};

export const getBillById = async (userId, billId) => {
    const bill = await Bill.findOne({ _id: billId, userId })
        .populate({
            path: 'paymentHistory.transactionId',
            select: 'account'
        });
    if (!bill) throw ApiError.notFound('Bill not found');
    return bill;
};

export const updateBill = async (userId, billId, updateData) => {
        const billExist = await Bill.findOne({ name: updateData.name.trim(), userId ,   
              _id: { $ne: billId }
        });
        if (billExist) {
            throw ApiError.notFound('Bill with this name  already exists');
        }
    if (updateData.amount !== undefined) {
        const currency = updateData.currency || 'USD';
        updateData.amount = await convertToUSD(updateData.amount, currency);
    }

    // Handle Cloudinary Image Update
    if (updateData.image && updateData.image.startsWith('data:image')) {
        updateData.image = await handleImageUpload(updateData.image);
    }

    const bill = await Bill.findOneAndUpdate(
        { _id: billId, userId },
        updateData,
        { new: true, runValidators: true }
    );
    if (!bill) throw ApiError.notFound('Bill not found');
    return bill;
};

export const deleteBill = async (userId, billId) => {
    const bill = await Bill.findOne({ _id: billId, userId });
    if (!bill) throw ApiError.notFound('Bill not found');

    // Delete associated transactions if any
    if (bill.paymentHistory && bill.paymentHistory.length > 0) {
        for (const payment of bill.paymentHistory) {
            if (payment.transactionId) {
                await transactionService.deleteTransaction(userId, payment.transactionId);
            }
        }
    }

    await bill.deleteOne();
    return bill;
};

export const cancelBill = async (userId, billId) => {
    const bill = await Bill.findOne({ _id: billId, userId });
    if (!bill) throw ApiError.notFound('Bill not found');
    
    if (bill.status === 'cancelled') {
        bill.status = 'pending';
        bill.autoRenew = true; // Resume cycles
        
        // Fast-forward due date to skip missed cycles
        const now = new Date();
        if (bill.isRecurring && bill.recurrence) {
            while (new Date(bill.dueDate) < now) {
                bill.dueDate = calculateNextDueDate(bill.dueDate, bill.recurrence);
            }
        }
    } else {
        bill.status = 'cancelled';
        bill.autoRenew = false; // Stop further cycles
    }
    
    await bill.save();
    return bill;
};


export const markBillAsPaid = async (userId, billId, paymentData = {}) => {
    const bill = await Bill.findOne({ _id: billId, userId });
    if (!bill) throw ApiError.notFound('Bill not found');
    if (bill.status === 'paid') throw ApiError.badRequest('Bill is already paid');
    if (bill.status === 'cancelled') throw ApiError.badRequest('Cannot pay a cancelled bill');

    // 1. Create Transaction
    let category = await Category.findOne({ name: 'Bills', isDefault: true });
        if (!category) {
            // Fallback to any default category or the first one found
            category = await Category.findOne({ isDefault: true });
        }

    const transaction = await transactionService.createTransaction(userId, {
        account: paymentData.accountId || bill.autoPayAccountId,
        title: `${bill.name}`,
        amount: paymentData.amount || bill.amount,
        type: 'expense',
        category: category?._id,
        date: paymentData.date || new Date(),
        note: `Paid ${bill.name} bill`
    });

    // 2. Update Payment History
    bill.paymentHistory.push({
        amount: paymentData.amount || bill.amount,
        date: paymentData.date || new Date(),
        transactionId: transaction._id
    });

    // 3. Handle Recurring Logic
    if (bill.isRecurring && bill.autoRenew) {
        bill.dueDate = calculateNextDueDate(bill.dueDate, bill.recurrence);
        bill.status = 'pending';
        bill.reminderNotified = false; // Reset for next period
    } else {
        bill.status = 'paid';
    }

    await bill.save();

    // ── Gamification ────────────────────────────────────────────────────────
    (async () => {
        try {
            await gamificationService.progressChallenge(userId, 'pay_bill');
        } catch (err) {
            console.error('[Gamification] Error on pay_bill challenge:', err.message);
        }
    })();
    // ────────────────────────────────────────────────────────────────────────

    return bill;
};

export const toggleRecurrence = async (userId, billId) => {
    const bill = await Bill.findOne({ _id: billId, userId });
    if (!bill) throw ApiError.notFound('Bill not found');

    if (bill.status=="cancelled") {
        throw ApiError.badRequest('autoRenew cannot be toggled for cancelled bills');
    }
    
    if (bill.status=="paid") {
        throw ApiError.badRequest('Bill already paid.Please Update the bill to continue.');
    }
    
    bill.isRecurring = !bill.isRecurring;
    await bill.save();
    return bill;
};

export const toggleAutoPaid = async (userId, billId) => {
    const bill = await Bill.findOne({ _id: billId, userId });
    if (!bill) throw ApiError.notFound('Bill not found');

    if (bill.status=="cancelled" || bill.status=="paid") {
        throw ApiError.badRequest('Auto-paid cannot be toggled for cancelled or paid bills');
    }

    bill.autoPaid = !bill.autoPaid;
    await bill.save();
    return bill;
};

export const getBillTrends = async (userId) => {
    const now = new Date();
    
    // Always calculate the last 6 months from now
    const stats = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        stats.push({
            month: d.toLocaleString('default', { month: 'short' }),
            monthNum: d.getMonth() + 1,
            year: d.getFullYear(),
            amount: 0,
            key: `${d.getFullYear()}-${d.getMonth() + 1}`
        });
    }

    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const billStatsRaw = await Bill.aggregate([
        { $match: { userId: new (await import('mongoose')).default.Types.ObjectId(userId) } },
        { $unwind: "$paymentHistory" },
        { 
            $match: { 
                "paymentHistory.date": { $gte: start, $lte: end } 
            } 
        },
        {
            $group: {
                _id: {
                    month: { $month: "$paymentHistory.date" },
                    year: { $year: "$paymentHistory.date" }
                },
                totalAmount: { $sum: "$paymentHistory.amount" }
            }
        }
    ]);

    billStatsRaw.forEach(stat => {
        const key = `${stat._id.year}-${stat._id.month}`;
        const monthData = stats.find(s => s.key === key);
        if (monthData) {
            monthData.amount = stat.totalAmount;
        }
    });

    const breakdown = await Bill.aggregate([
        { $match: { userId: new (await import('mongoose')).default.Types.ObjectId(userId) } },
        { $unwind: "$paymentHistory" },
        { 
            $match: { 
                "paymentHistory.date": { $gte: start, $lte: end } 
            } 
        },
        {
            $group: {
                _id: "$name",
                total: { $sum: "$paymentHistory.amount" },
                count: { $sum: 1 }
            }
        },
        { $sort: { total: -1 } }
    ]);

    return {
        trends: stats,
        breakdown: breakdown.map(b => ({
            name: b._id,
            amount: b.total,
            count: b.count
        }))
    };
};