import axios from 'axios';
import Category from '../models/categories.model.js';
import Saving from '../models/saving.model.js';
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


export const createSavingGoal = async (userId, data) => {
        const goalExist = await Saving.findOne({ title: data.title.trim(), userId });
        if (goalExist) {
            throw ApiError.notFound('Saving with this name  already exists');
        }
    const currency = data.currency;
    const amountInUSD = await convertToUSD(data.amount, currency);

    return await Saving.create({
        ...data,
        userId,
        amount: amountInUSD

    });
};

export const getSavingGoals = async (userId, filters = {}) => {
    const query = { userId: userId };

    if (filters.title && filters.title.trim() !== '') {
        query.title = {
            $regex: filters.title,
            $options: 'i' 
        };
    }

    const goals = await Saving.find(query).sort({ createdAt: -1 });

    const totals = goals.reduce((acc, goal) => {
        acc.totalTarget += goal.amount || 0;
        acc.totalSaved += goal.total || 0;
        return acc;
    }, { totalTarget: 0, totalSaved: 0 });

    return {
        goals,
        ...totals
    };
};

export const getSavingGoalById = async (userId, goalId) => {
    const goal = await Saving.findOne({ _id: goalId, userId });
    if (!goal) {
        throw ApiError.notFound('Saving goal not found');
    }
    return goal;
};

export const updateSavingGoal = async (userId, goalId, data) => {
        const goalExist = await Saving.findOne({ title: data.title.trim(), userId ,   
              _id: { $ne: goalId }
        });
        if (goalExist) {
            throw ApiError.notFound('Saving with this name  already exists');
        }
    if (data.amount !== undefined) {
        const currency = data.currency || 'USD';
        data.amount = await convertToUSD(data.amount, currency);
    }

    const goal = await Saving.findOneAndUpdate(
        { _id: goalId, userId },
        { $set: data },
        { new: true, runValidators: true }
    );
    if (!goal) {
        throw ApiError.notFound('Saving goal not found');
    }
    return goal;
};

export const deleteSavingGoal = async (userId, goalId) => {
    const goal = await Saving.findOneAndDelete({ _id: goalId, userId });
    if (!goal) {
        throw ApiError.notFound('Saving goal not found');
    }
    
    // Delete all transactions linked to this goal's progress
    const transactionIds = goal.savedAmounts.map(p => p.transactionId).filter(id => id);
    if (transactionIds.length > 0) {
        for (const tid of transactionIds) {
            await transactionService.deleteTransaction(userId, tid);
        }
    }
    
    return goal;
};


export const addProgress = async (userId, goalId, data) => {
    const goal = await Saving.findOne({ _id: goalId, userId });
    if (!goal) {
        throw ApiError.notFound('Saving goal not found');
    }

    const { amount, currency, date, accountId } = data;
    const amountInUSD = await convertToUSD(amount, currency || 'USD');

    // Find the global "Saving" category
    const savingCategory = await Category.findOne({ name: 'Saving' ,isDefault: true });
    if (!savingCategory) {
        throw ApiError.internal('Internal error: "Saving" category not found. Please contact admin.');
    }

    // Create a transaction of type "saving"
    const transaction = await transactionService.createTransaction(userId, {
        account: accountId,
        category: savingCategory._id,
        title: goal.title,
        amount: amountInUSD, // createTransaction handles conversion
        currency: 'USD',
        type: 'saving',
        date: date || new Date()
    });

    // Add to savedAmounts array
    goal.savedAmounts.push({
        amount: amountInUSD,
        date: date || new Date(),
        transactionId: transaction._id
    });

    // Update total
    goal.total += amountInUSD;

    const savedGoal = await goal.save();

    // ── Gamification ────────────────────────────────────────────────────────
    (async () => {
        try {
            // pass amountUSD so the challenge tracks cumulative savings
            await gamificationService.progressChallenge(userId, 'save_small_amount', 1, amountInUSD);
        } catch (err) {
            console.error('[Gamification] Error on save_small_amount challenge:', err.message);
        }
    })();
    // ────────────────────────────────────────────────────────────────────────

    return savedGoal;
};

export const updateProgress = async (userId, goalId, progressId, data) => {
    const goal = await Saving.findOne({ _id: goalId, userId });
    if (!goal) {
        throw ApiError.notFound('Saving goal not found');
    }

    const progressIndex = goal.savedAmounts.findIndex(p => p._id.toString() === progressId);
    if (progressIndex === -1) {
        throw ApiError.notFound('Progress entry not found');
    }

    const entry = goal.savedAmounts[progressIndex];
    const oldAmountInUSD = entry.amount;
    let newAmountInUSD = oldAmountInUSD;

    if (data.amount !== undefined) {
        newAmountInUSD = await convertToUSD(data.amount, data.currency || 'USD');
        entry.amount = newAmountInUSD;
    }

    if (data.date) {
        entry.date = data.date;
    }

    // Update the linked transaction if it exists
    if (entry.transactionId) {
        await transactionService.updateTransaction(userId, entry.transactionId, {
            accountId: data.accountId,
            amount: newAmountInUSD,
            currency: 'USD',
            date: data.date,
        });
        
        // Refetch the updated transaction to get the converted USD amount if it changed
        const updatedTx = await transactionService.getTransactionById(userId, entry.transactionId);
        newAmountInUSD = updatedTx.amount;
        entry.amount = newAmountInUSD;
    }

    // Update total
    goal.total = goal.total - oldAmountInUSD + newAmountInUSD;

    return await goal.save();
};

export const deleteProgress = async (userId, goalId, progressId) => {
    const goal = await Saving.findOne({ _id: goalId, userId });
    if (!goal) {
        throw ApiError.notFound('Saving goal not found');
    }

    const progressIndex = goal.savedAmounts.findIndex(p => p._id.toString() === progressId);
    if (progressIndex === -1) {
        throw ApiError.notFound('Progress entry not found');
    }

    const entry = goal.savedAmounts[progressIndex];
    const amountToRemove = entry.amount;

    // Delete the linked transaction if it exists
    if (entry.transactionId) {
        await transactionService.deleteTransaction(userId, entry.transactionId);
    }

    // Remove the entry
    goal.savedAmounts.splice(progressIndex, 1);

    // Update total
    goal.total -= amountToRemove;

    return await goal.save();
};

export const getGoalInsights = async (userId, goalId, language) => {
    const goal = await Saving.findOne({ _id: goalId, userId });
    if (!goal) {
        throw ApiError.notFound('Saving goal not found');
    }
    
    // Import aiService dynamically to avoid circular dependencies if any
    const aiService = await import('../services/ai.service.js');
    return await aiService.getSavingGoalInsights(goal, language);
};

export const getAPayment = async (userId, goalId, progressId) => {
    const goal = await Saving.findOne({ _id: goalId, userId });
    if (!goal) {
        throw ApiError.notFound('Saving goal not found');
    }

    const payment = goal.savedAmounts.id(progressId);
    if (!payment) {
        throw ApiError.notFound('Payment entry not found');
    }

    return payment;
};

export const getSavingsMonthlyTrends = async (userId) => {
    const now = new Date();
    
    // Always calculate the last 6 months from now
    const stats = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        stats.push({
            month: d.toLocaleString('default', { month: 'short' }),
            monthNum: d.getMonth() + 1,
            year: d.getFullYear(),
            saved: 0,
            key: `${d.getFullYear()}-${d.getMonth() + 1}`
        });
    }

    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const savingsStatsRaw = await Saving.aggregate([
        { $match: { userId: new (await import('mongoose')).default.Types.ObjectId(userId) } },
        { $unwind: "$savedAmounts" },
        { 
            $match: { 
                "savedAmounts.date": { $gte: start, $lte: end } 
            } 
        },
        {
            $group: {
                _id: {
                    month: { $month: "$savedAmounts.date" },
                    year: { $year: "$savedAmounts.date" }
                },
                totalSaved: { $sum: "$savedAmounts.amount" }
            }
        }
    ]);

    savingsStatsRaw.forEach(stat => {
        const key = `${stat._id.year}-${stat._id.month}`;
        const monthData = stats.find(s => s.key === key);
        if (monthData) {
            monthData.saved = stat.totalSaved;
        }
    });

    return stats;
};


