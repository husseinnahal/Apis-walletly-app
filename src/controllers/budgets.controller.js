import * as budgetsService from '../services/budget.service.js';

export const getMyBudgets = async (req, res) => {
    const budgets = await budgetsService.getMyBudgets(req.user._id);
    res.status(200).json({ 
        success: true, 
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: budgets 
    });
};

export const getBudgetStats = async (req, res) => {
    const stats = await budgetsService.getBudgetStats(req.user._id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: stats
    });
};

export const getBudget = async (req, res) => {
    const budget = await budgetsService.getBudget(req.user._id, req.params.budgetId);
    res.status(200).json({ 
        success: true, 
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: budget 
    });
};

export const createBudget = async (req, res) => {
    const budget = await budgetsService.createBudget(req.user._id, req.body);
    res.status(201).json({ 
        success: true, 
        message: 'Budget created successfully',
        data: budget 
    });
};

export const updateBudget = async (req, res) => {
    const budget = await budgetsService.updateBudget(req.user._id, req.params.budgetId, req.body);
    res.status(200).json({
        success: true, 
        message: 'Budget updated successfully',
        data: budget 
    });
};

export const deleteBudget = async (req, res) => {
    await budgetsService.deleteBudget(req.user._id, req.params.budgetId);
    res.status(200).json({ 
        success: true, 
        message: 'Budget deleted successfully' 
    });
};

export const toggleActive = async (req, res) => {
    const budget = await budgetsService.toggleActive(req.user._id, req.params.budgetId);
    res.status(200).json({ 
        success: true, 
        message: `Budget ${budget.isActive ? 'activated' : 'deactivated'} successfully`,
        data: budget 
    });
};

export const toggleRenew = async (req, res) => {
    const budget = await budgetsService.toggleRenew(req.user._id, req.params.budgetId);
    res.status(200).json({ 
        success: true, 
         message: `Auto-renew ${budget.autoRenew ? 'enabled' : 'disabled'} successfully`,
        data: budget 
    });
};
export const toggleOverAmount = async (req, res) => {
    const budget = await budgetsService.toggleOverAmount(req.user._id, req.params.budgetId);
    res.status(200).json({ 
        success: true, 
        message: `Carry-over ${budget.carryOverEnabled ? 'enabled' : 'disabled'} successfully`,
        data: budget 
    });
};