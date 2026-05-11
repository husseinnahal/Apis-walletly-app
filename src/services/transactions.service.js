import axios from 'axios';
import mongoose from 'mongoose';
import Account from '../models/accounts.model.js';
import Budget from '../models/budgets.model.js';
import Transaction from '../models/transactions.model.js';
import ApiError from '../utils/ApiError.js';
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
        console.error('Error fetching exchange rates:', error.message);
        throw ApiError.internal('Failed to fetch exchange rates');
    }
};

// Helper function to update active budget spent amount
const updateBudgetSpentAmount = async (userId, categoryId, amountChange) => {
    const activeBudget = await Budget.findOne({
        user: userId,
        category: categoryId,
        isActive: true
    });

    if (activeBudget) {
        // Prevent spent amount from going below 0 (just in case of negative changes)
        const newSpent = Math.max(0, activeBudget.spent + amountChange);
        activeBudget.spent = newSpent;
        await activeBudget.save();
    }
};

// Helper function to update account balance
const updateAccountBalance = async (userId, accountId, amountChange) => {
    if (!accountId) return;
    const account = await Account.findOne({ _id: accountId, user: userId });
    if (account) {
        account.totalBalance += amountChange;
        await account.save();
    }
};

export const createTransaction = async (userId, transactionData) => {
    const currency = transactionData.currency;
    const amountInUSD = await convertToUSD(transactionData.amount, currency);

    const transaction = await Transaction.create({
        ...transactionData,
        user: userId,
        amount: amountInUSD
    });

    // If it's an expense, update the active budget for this category
    if (transaction.type === 'expense') {
        await updateBudgetSpentAmount(userId, transaction.category, amountInUSD);
    }

    // Update Account Balance if provided
    if (transaction.account) {
        const balanceChange = (transaction.type === 'income') ? amountInUSD : -amountInUSD;
        await updateAccountBalance(userId, transaction.account, balanceChange);
    }

    // ── Gamification ────────────────────────────────────────────────────────
    (async () => {
        try {
            // 1. Record daily activity → updates streak + awards coins
            await gamificationService.recordActivity(userId);

            // 2. Advance relevant daily challenges efficiently in one DB call
            const challengeUpdates = [];
            
            if (transaction.type === 'income') {
                challengeUpdates.push({ type: 'add_income', increment: 1 });
            }
            if (transaction.type === 'expense') {
                challengeUpdates.push({ type: 'add_2_expenses', increment: 1 });
            }
            
            // Every transaction counts as a financial action and towards the 3 transactions challenge
            challengeUpdates.push({ type: 'complete_3_actions', increment: 1 });
            challengeUpdates.push({ type: 'add_3_transactions', increment: 1 });

            if (challengeUpdates.length > 0) {
                await gamificationService.progressMultipleChallenges(userId, challengeUpdates);
            }
        } catch (err) {
            console.error('[Gamification] Error recording transaction activity:', err.message);
        }
    })();
    // ────────────────────────────────────────────────────────────────────────

    return transaction;
};

export const getTransactions = async (userId, filters = {}) => {
    const query = { user: userId };

    // Filter by type (income / expense / saving / transfer)
    if (filters.type) {
        query.type = filters.type;
    }

    // Filter by category
    if (filters.category) {
        const categories = Array.isArray(filters.category) ? filters.category : filters.category.split(',');
        query.category = { $in: categories };
    }

    // Handle Dates & Periods
    // period  (today, yesterday, week, month, year) 
    let startDate, endDate;

    if (filters.period) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filters.period.toLowerCase()) {
            case 'today':
                startDate = new Date(startOfToday);
                startDate.setDate(startDate.getDate() );
                endDate = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
            case 'yesterday':
                startDate = new Date(startOfToday);
                startDate.setDate(startDate.getDate() - 1);
                endDate = new Date(startOfToday.getTime() - 1);
                break;
            case 'week':
                startDate = new Date(startOfToday);
                startDate.setDate(startDate.getDate() - 7);
                endDate = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'yearly':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
        }
    }

    // Explicit startDate and endDate override period
    if (filters.startDate) {
        startDate = new Date(filters.startDate);
    }
    if (filters.endDate) {
        endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
    }

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
    }

    const transactions = await Transaction.find(query)
        .populate('category', 'name icon')
        .sort({ date: -1 ,createdAt: -1});

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
  

    const todayTransactions = [];
    const otherTransactions = [];
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalSavings = 0;

    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else if (t.type === 'expense') totalExpenses += t.amount;
        else if (t.type === 'saving') totalSavings += t.amount;

        const txDateStr = new Date(t.date).toISOString().split('T')[0];
        if (txDateStr === todayStr) {
            todayTransactions.push(t);
        } else {
            otherTransactions.push(t);
        }
    });

    return { todayTransactions, otherTransactions, totalIncome, totalExpenses, totalSavings };
};

export const getTransactionById = async (userId, transactionId) => {
    const transaction = await Transaction.findOne({ _id: transactionId, user: userId })
        .populate('category', 'name icon');
        
    if (!transaction) {
        throw ApiError.notFound('Transaction not found');
    }
    
    return transaction;
};

export const updateTransaction = async (userId, transactionId, updateData) => {
    const transaction = await Transaction.findOne({ _id: transactionId, user: userId });
    
    if (!transaction) {
        throw ApiError.notFound('Transaction not found');
    }

    const oldType = transaction.type;
    const oldAmount = transaction.amount;
    const oldCategory = transaction.category.toString();
    
    if (updateData.amount !== undefined) {
        const currency = updateData.currency || 'USD';
        updateData.amount = await convertToUSD(updateData.amount, currency);
    }
    const updatedTransaction = await Transaction.findByIdAndUpdate(
        transactionId,
        updateData,
        { new: true, runValidators: true }
    );

    const newType = updatedTransaction.type;
    const newAmount = updatedTransaction.amount;
    const newCategory = updatedTransaction.category.toString();

    // Revert old budget spent if the old transaction was an expense
    if (oldType === 'expense') {
        await updateBudgetSpentAmount(userId, oldCategory, -oldAmount);
    }
    
    // Apply new budget spent if the new transaction is an expense
    if (newType === 'expense') {
        await updateBudgetSpentAmount(userId, newCategory, newAmount);
    }

    // Handle Account Balance Update
    // 1. Revert old balance
    if (transaction.account) {
        const oldBalanceChange = (oldType === 'income') ? -oldAmount : oldAmount;
        await updateAccountBalance(userId, transaction.account, oldBalanceChange);
    }

    // 2. Apply new balance
    if (updatedTransaction.account) {
        const newBalanceChange = (newType === 'income') ? newAmount : -newAmount;
        await updateAccountBalance(userId, updatedTransaction.account, newBalanceChange);
    }

    return updatedTransaction;
};

export const deleteTransaction = async (userId, transactionId) => {
    const transaction = await Transaction.findOneAndDelete({ _id: transactionId, user: userId });
    
    if (!transaction) {
        throw ApiError.notFound('Transaction not found');
    }

    // Revert budget spent if it was an expense
    if (transaction.type === 'expense') {
        await updateBudgetSpentAmount(userId, transaction.category, -transaction.amount);
    }

    // Revert account balance
    if (transaction.account) {
        const balanceChange = (transaction.type === 'income') ? -transaction.amount : transaction.amount;
        await updateAccountBalance(userId, transaction.account, balanceChange);
    }

    return true;
};

export const getDailyStats = async (userId, filters = {}) => {
    const now = new Date();
    const targetMonth = filters.month !== undefined ? parseInt(filters.month) : now.getMonth();
    const targetYear = filters.year !== undefined ? parseInt(filters.year) : now.getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const dailyStatsRaw = await Transaction.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }
        },
        {
            $group: {
                _id: {
                    day: { $dayOfMonth: "$date" },
                    type: "$type"
                },
                total: { $sum: "$amount" }
            }
        }
    ]);

    const daysInMonth = endOfMonth.getDate();
    const dailyStats = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        income: 0,
        expense: 0
    }));

    dailyStatsRaw.forEach(stat => {
        const dayIdx = stat._id.day - 1;
        if (stat._id.type === 'income') dailyStats[dayIdx].income = stat.total;
        if (stat._id.type === 'expense') dailyStats[dayIdx].expense = stat.total;
    });

    return dailyStats;
};

export const getMonthlyTrends = async (userId) => {
    const now = new Date();
    
    // Always calculate the last 6 months from now
    const stats = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        stats.push({
            month: d.toLocaleString('default', { month: 'short' }),
            monthNum: d.getMonth() + 1,
            year: d.getFullYear(),
            income: 0,
            expense: 0,
            key: `${d.getFullYear()}-${d.getMonth() + 1}`
        });
    }

    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyStatsRaw = await Transaction.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                date: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: {
                    month: { $month: "$date" },
                    year: { $year: "$date" },
                    type: "$type"
                },
                total: { $sum: "$amount" }
            }
        }
    ]);

    monthlyStatsRaw.forEach(stat => {
        const key = `${stat._id.year}-${stat._id.month}`;
        const monthData = stats.find(s => s.key === key);
        if (monthData) {
            if (stat._id.type === 'income') monthData.income = stat.total;
            if (stat._id.type === 'expense') monthData.expense = stat.total;
        }
    });

    return stats;
};

export const getCategoryBreakdown = async (userId, filters = {}) => {
    const now = new Date();
    const range = filters.range || 'today';
    const targetYear = filters.year !== undefined ? parseInt(filters.year) : now.getFullYear();
    const targetMonth = filters.month !== undefined ? parseInt(filters.month) : now.getMonth();

    let catStartDate, catEndDate;

    if (range === 'today') {
        catStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        catEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (range === 'week') {
        catStartDate = new Date(now);
        catStartDate.setDate(now.getDate() - 7);
        catEndDate = new Date(now);
    } else if (range === 'year') {
        catStartDate = new Date(targetYear, 0, 1);
        catEndDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    } else { // month
        catStartDate = new Date(targetYear, targetMonth, 1);
        catEndDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    }

    const categoryStatsRaw = await Transaction.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                date: { $gte: catStartDate, $lte: catEndDate }
            }
        },
        {
            $group: {
                _id: {
                    category: "$category",
                    type: "$type"
                },
                total: { $sum: "$amount" },
                count: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "_id.category",
                foreignField: "_id",
                as: "categoryInfo"
            }
        },
        { $unwind: "$categoryInfo" }
    ]);

    const categoryBreakdown = {
        expense: [],
        income: []
    };

    let totalRangeExpense = 0;
    let totalRangeIncome = 0;

    categoryStatsRaw.forEach(stat => {
        const item = {
            name: stat.categoryInfo.name,
            icon: stat.categoryInfo.icon,
            amount: stat.total,
            count: stat.count
        };
        if (stat._id.type === 'expense') {
            categoryBreakdown.expense.push(item);
            totalRangeExpense += stat.total;
        } else if (stat._id.type === 'income') {
            categoryBreakdown.income.push(item);
            totalRangeIncome += stat.total;
        }
    });

    categoryBreakdown.expense = categoryBreakdown.expense.map(item => ({
        ...item,
        percentage: totalRangeExpense > 0 ? ((item.amount / totalRangeExpense) * 100).toFixed(1) : 0
    })).sort((a, b) => b.amount - a.amount);

    categoryBreakdown.income = categoryBreakdown.income.map(item => ({
        ...item,
        percentage: totalRangeIncome > 0 ? ((item.amount / totalRangeIncome) * 100).toFixed(1) : 0
    })).sort((a, b) => b.amount - a.amount);

    return {
        categoryBreakdown,
        totalRangeExpense,
        totalRangeIncome
    };
};
