import axios from 'axios';
import Budget from '../models/budgets.model.js';
import ApiError from '../utils/ApiError.js';

// Helper function to convert amount to USD
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

export const getMyBudgets = async (userId, filters = {}) => {
  const query = { user: userId };

  // Search by name
  if (filters.name && filters.name.trim() !== '') {
    query.name = {
      $regex: filters.name,
      $options: 'i', 
    };
  }

    if (filters.isActive && filters.isActive !== 'all') {
        query.isActive = filters.isActive;
    }

  const budgets = await Budget.find(query)
    .populate("category", "name icon")
    .sort({ isActive: -1, createdAt: -1 });

  // 📊 Calculate totals
  const totals = budgets.reduce(
    (acc, budget) => {
      if (budget.isActive) {
        acc.totalAmount += (budget.amount || 0) + (budget.carriedOverAmount || 0);
        acc.totalSpent += budget.spent || 0;
      }
      return acc;
    },
    { totalAmount: 0, totalSpent: 0 }
  );

  return {
    budgets,
    totals
  };
};

/**
 * Get simplified budget statistics (Totals and overall percentage)
 */
export const getBudgetStats = async (userId) => {
    const budgets = await Budget.find({ user: userId, isActive: true });

    const totalAmount = budgets.reduce((sum, b) => sum + (b.amount || 0) + (b.carriedOverAmount || 0), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
    
    let percentage = totalAmount > 0 ? (totalSpent / totalAmount) * 100 : 0;
    percentage = Math.min(percentage, 100).toFixed(1);

    return {
        totalAmount,
        totalSpent,
        percentage: Number(percentage)
    };
};

export const getBudget = async (userId, budgetId) => {
    const budget = await Budget.findOne({ 
        _id: budgetId, 
        user: userId 
    }).populate("category", "name icon");
   
    if (!budget) {
        throw ApiError.notFound('Budget not found');
    }

    return  budget ;
};

export const createBudget = async (userId, budgetData) => {
    // same name
    const existingByName = await Budget.findOne({
        user: userId,
        name: budgetData.name,
    });
    if (existingByName) {
        throw ApiError.badRequest('You already have a budget with this name');
    }

    //  budget in the same category
    const existingByCategory = await Budget.findOne({
        user: userId,
        category: budgetData.category,
    });
    if (existingByCategory) {
        throw ApiError.badRequest('You already have a budget for this category');
    }

    const currency = budgetData.currency;
    const amountInUSD = await convertToUSD(budgetData.amount, currency);

    return await Budget.create({
        ...budgetData,
        user: userId,
        amount: amountInUSD
    });
};

export const updateBudget = async (userId, budgetId, updateData) => {
    const budget = await Budget.findOne({
        _id: budgetId,
        user: userId
    });

    if (!budget) {
        throw ApiError.notFound('Budget not found');
    }

    // Check duplicate name 
    if (updateData.name) {
        const existingByName = await Budget.findOne({
            user: userId,
            name: updateData.name,
            _id: { $ne: budgetId },
        });
        if (existingByName) {
            throw ApiError.badRequest('You already have a budget with this name');
        }
    }

    // Check duplicate category 
    if (updateData.category) {
        const existingByCategory = await Budget.findOne({
            user: userId,
            category: updateData.category,
            _id: { $ne: budgetId },
        });
        if (existingByCategory) {
            throw ApiError.badRequest('You already have a budget for this category');
        }
    }

    if (updateData.amount !== undefined) {
        const currency = updateData.currency || 'USD';
        updateData.amount = await convertToUSD(updateData.amount, currency);
    }
    
    const updated = await Budget.findByIdAndUpdate(
        budgetId,
        updateData,
        { new: true, runValidators: true }
    ).populate("category", "name icon");

    if (!updated) {
        throw ApiError.notFound('Budget not found');
    }

    return updated;
};

export const deleteBudget = async (userId, budgetId) => {
    const deleted = await Budget.findOneAndDelete({
        _id: budgetId,
        user: userId
    });

    if (!deleted) {
        throw ApiError.notFound('Budget not found');
    }

    return true;
};

export const toggleActive = async (userId, budgetId) => {
    const budget = await Budget.findOne({
        _id: budgetId,
        user: userId
    });

    if (!budget) {
        throw ApiError.notFound('Budget not found');
    }

    budget.isActive = !budget.isActive;
    await budget.save();

    return budget;
};

export const toggleRenew = async (userId, budgetId) => {
    const budget = await Budget.findOne({
        _id: budgetId,
        user: userId
    });

    if (!budget) {
        throw ApiError.notFound('Budget not found');
    }

    budget.autoRenew = !budget.autoRenew;
    await budget.save();

    return budget;
};

export const toggleOverAmount = async (userId, budgetId) => {
    const budget = await Budget.findOne({
        _id: budgetId,
        user: userId
    });

    if (!budget) {
        throw ApiError.notFound('Budget not found');
    }

    budget.carryOverEnabled = !budget.carryOverEnabled;
    await budget.save();

    return budget;
};




