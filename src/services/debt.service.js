import axios from 'axios';
import Category from '../models/categories.model.js';
import Debt from '../models/debt.model.js';
import ApiError from '../utils/ApiError.js';
import * as transactionService from './transactions.service.js';
import * as gamificationService from './gamification.service.js';


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
        const amountInUSD = (amount / rate).toFixed(2);

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


export const createDebt = async (userId, debtData) => {
    
    const currency = debtData.currency;
    let amountInUSD = debtData.amount;
    if (currency && currency !== 'USD') {
     amountInUSD = await convertToUSD(debtData.amount, currency || 'USD');
    }

    const debt = await Debt.create({
        ...debtData,
        userId,
        amount: amountInUSD

    });
    return debt;
};

export const getDebts = async (userId, filters = {}) => {
    const query = { userId };
    
    if (filters.type && filters.type !== 'all') {
        query.type = filters.type;
    }
    if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
    }
    if (filters.person && filters.person.trim() !== '') {
    query.person = { 
        $regex: filters.person, 
        $options: 'i' 
    };
    }

    const debts = await Debt.find(query)
        .sort({ status: 1, createdAt: -1 })
        .populate({
            path: 'paidDebt.transactionId',
            select: 'account'
        });

    const processedDebts = debts.map(debt => {
        const debtObj = debt.toObject();
        
        // Calculate Flat Interest Rate (Principal * Rate%)
        if (debtObj.interestRate && debtObj.interestRate > 0) {
            const accumulatedInterest = (debtObj.amount * (debtObj.interestRate / 100));
            debtObj.accumulatedInterest = Number(accumulatedInterest.toFixed(2));
            debtObj.totalAmountWithInterest = Number((debtObj.amount + accumulatedInterest).toFixed(2));
        } else {
            debtObj.accumulatedInterest = 0;
            debtObj.totalAmountWithInterest = debtObj.amount;
        }
        
        return debtObj;
    });

    const totals = processedDebts.reduce((acc, debt) => {
        const target = debt.totalAmountWithInterest || 0;
        const paid = debt.total || 0;

        if (debt.type === 'debt' && debt.status === 'active') {
            acc.debt.total += target;
            acc.debt.paid += paid;
            acc.debt.activeCount++;
        } else if (debt.type === 'credit' && debt.status === 'active') {
            acc.credit.total += target;
            acc.credit.paid += paid;
            acc.credit.activeCount++;
        }

        return acc;
    }, { 
        debt: { total: 0, paid: 0, activeCount: 0 }, 
        credit: { total: 0, paid: 0, activeCount: 0 } 
    });

    const summary = {
        debt: {
            ...totals.debt,
            percentage: totals.debt.total > 0 ? Number(((totals.debt.paid / totals.debt.total) * 100).toFixed(1)) : 0
        },
        credit: {
            ...totals.credit,
            percentage: totals.credit.total > 0 ? Number(((totals.credit.paid / totals.credit.total) * 100).toFixed(1)) : 0
        }
    };

    return {
        debts: processedDebts,
        summary
    }
};

export const getDebtById = async (userId, debtId) => {
    const debt = await Debt.findOne({ _id: debtId, userId })
        .populate({
            path: 'paidDebt.transactionId',
            select: 'account'
        });
    if (!debt) throw ApiError.notFound('Debt not found');
    return debt;
};

export const updateDebt = async (userId, debtId, debtData) => {
    const debt = await Debt.findOne({ _id: debtId, userId });
    if (!debt) throw ApiError.notFound('Debt not found');

    const { amount, currency, ...otherData } = debtData;
    
    if (amount !== undefined) {
        let amountInUSD = amount;

        if (currency && currency !== 'USD') {
            amountInUSD = await convertToUSD(amount, currency);
        }

        // check before updating
        if (debt.total > amountInUSD) {
            throw ApiError.badRequest('Total payments cannot exceed debt amount');
        }

        debt.amount = amountInUSD;
    }

    Object.assign(debt, otherData);

    // status update
    if (debt.total === debt.amount) {
        debt.status = 'paid';
    } else {
        debt.status = 'active';
    }

    return await debt.save();
};

export const deleteDebt = async (userId, debtId) => {
    const debt = await Debt.findOne({ _id: debtId, userId });
    if (!debt) throw ApiError.notFound('Debt not found');

    // Delete all linked transactions
    const transactionIds = debt.paidDebt.map(p => p.transactionId).filter(id => id);
    if (transactionIds.length > 0) {
        for (const tid of transactionIds) {
            await transactionService.deleteTransaction(userId, tid);
        }
    }

    await debt.deleteOne();
    return { message: 'Debt and associated transactions deleted' };
};




export const addPayment = async (userId, debtId, paymentData) => {
    const debt = await Debt.findOne({ _id: debtId, userId });
    if (!debt) throw ApiError.notFound('Debt not found');

    const { amount, date, currency, accountId } = paymentData;

    let amountInUSD = amount;
    if (currency && currency !== 'USD') {
     amountInUSD = await convertToUSD(amount, currency || 'USD');
    }

    if (debt.total + amountInUSD > debt.amount) {
        throw ApiError.badRequest('Payment exceeds remaining debt amount');
    }

    // Determine Transaction Type
    const transactionType = debt.type === 'debt' ? 'expense' : 'income';
    
    // Get Category
    const category = await Category.findOne({ name: 'Debt' ,isDefault: true });
    if (!category) {
        throw ApiError.internal('Internal error: "Debt" category not found. Please contact admin.');
    }
    
    // Create Transaction
    const transaction = await transactionService.createTransaction(userId, {
        account: accountId,
        amount: amountInUSD,
        currency: 'USD',
        type: transactionType,
        category: category._id,
        date: date || new Date(),
        title: `Debt Payment`,
        note: debt.type === 'debt' ? `Paid to ${debt.person}`  : `Received payment from ${debt.person}`,
    });

    // 5. Update Debt Record
    debt.paidDebt.push({
        amount: amountInUSD,
        date: date || new Date(),
        transactionId: transaction._id,
    });

    debt.total += amountInUSD; 
    
    // Auto-update status if fully paid
    if (debt.total >= debt.amount) {
        debt.status = 'paid';
    }

    await debt.save();

    // ── Gamification ────────────────────────────────────────────────────────
    (async () => {
        try {
            await gamificationService.progressChallenge(userId, 'pay_debt_credit');
        } catch (err) {
            console.error('[Gamification] Error on pay_debt_credit challenge:', err.message);
        }
    })();
    // ────────────────────────────────────────────────────────────────────────

    return debt;
};

export const deletePayment = async (userId, debtId, paymentId) => {
    const debt = await Debt.findOne({ _id: debtId, userId });
    if (!debt) throw ApiError.notFound('Debt not found');

    const paymentIndex = debt.paidDebt.findIndex(p => p._id.toString() === paymentId);
    if (paymentIndex === -1) throw ApiError.notFound('Payment entry not found');

    const payment = debt.paidDebt[paymentIndex];

    // Delete linked transaction
    if (payment.transactionId) {
        await transactionService.deleteTransaction(userId, payment.transactionId);
    }


    debt.total -= payment.amount;
    
    debt.paidDebt.splice(paymentIndex, 1);
    
    if (debt.total < debt.amount) {
        debt.status = 'active';
    }

    await debt.save();
    return debt;
};

export const updatePayment = async (userId, debtId, paymentId, paymentData) => {
    const debt = await Debt.findOne({ _id: debtId, userId });
    if (!debt) throw ApiError.notFound('Debt not found');

    const paymentIndex = debt.paidDebt.findIndex(p => p._id.toString() === paymentId);
    if (paymentIndex === -1) throw ApiError.notFound('Payment entry not found');

    const payment = debt.paidDebt[paymentIndex];
    const { amount, date, currency, accountId } = paymentData;

    let amountInUSD = amount;
    if (currency && currency !== 'USD') {
        amountInUSD = await convertToUSD(amount, currency);
    }

    // calculate new total BEFORE updating
    const newTotal = debt.total - payment.amount + amountInUSD;
    if (newTotal > debt.amount) {
        throw ApiError.badRequest('Updated payment exceeds debt amount');
    }

    // Update linked transaction if it exists
    if (payment.transactionId) {
        await transactionService.updateTransaction(userId, payment.transactionId, {
            accountId: accountId,
            amount: amountInUSD,
            currency: 'USD',
            date: date || payment.date ,
            
        });
        
        // Refetch updated transaction for USD amount
        const updatedTx = await transactionService.getTransactionById(userId, payment.transactionId);
        amountInUSD = updatedTx.amount;
    }

    debt.total = newTotal;

    payment.amount = amountInUSD;
    payment.date = date || payment.date;

    // status logic 
    if (debt.total === debt.amount) {
        debt.status = 'paid';
    } else {
        debt.status = 'active';
    }

    await debt.save();
    return debt;
};

export const getAPayment = async (userId, goalId, progressId) => {
    const goal = await Debt.findOne({ _id: goalId, userId })
        .populate({
            path: 'paidDebt.transactionId',
            select: 'account'
        });
    if (!goal) {
        throw ApiError.notFound('Debt not found');
    }

    const payment = goal.paidDebt.id(progressId);
    if (!payment) {
        throw ApiError.notFound('Payment entry not found');
    }

    return payment;
};

export const getDebtMonthlyTrends = async (userId) => {
    const now = new Date();
    
    // Always calculate the last 6 months from now
    const stats = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        stats.push({
            month: d.toLocaleString('default', { month: 'short' }),
            monthNum: d.getMonth() + 1,
            year: d.getFullYear(),
            debt: 0,
            credit: 0,
            key: `${d.getFullYear()}-${d.getMonth() + 1}`
        });
    }

    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const debtStatsRaw = await Debt.aggregate([
        { $match: { userId: new (await import('mongoose')).default.Types.ObjectId(userId) } },
        { $unwind: "$paidDebt" },
        { 
            $match: { 
                "paidDebt.date": { $gte: start, $lte: end } 
            } 
        },
        {
            $group: {
                _id: {
                    month: { $month: "$paidDebt.date" },
                    year: { $year: "$paidDebt.date" },
                    type: "$type"
                },
                totalPaid: { $sum: "$paidDebt.amount" }
            }
        }
    ]);

    debtStatsRaw.forEach(stat => {
        const key = `${stat._id.year}-${stat._id.month}`;
        const monthData = stats.find(s => s.key === key);
        if (monthData) {
            if (stat._id.type === 'debt') monthData.debt = stat.totalPaid;
            if (stat._id.type === 'credit') monthData.credit = stat.totalPaid;
        }
    });

    return stats;
};
