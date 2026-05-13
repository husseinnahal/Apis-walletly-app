import * as savingsService from '../services/savings.service.js';

export const createSavingGoal =async (req, res) => {
    const goal = await savingsService.createSavingGoal(req.user._id, req.body);
    res.status(201).json({
        success: true,
        data: goal
    });
};

export const getSavingGoals =async (req, res) => {
    const goals = await savingsService.getSavingGoals(req.user._id, req.query);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: goals
    });
};

export const getSavingGoalById =async (req, res) => {
    const goal = await savingsService.getSavingGoalById(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: goal
    });
};

export const updateSavingGoal =async (req, res) => {
    const goal = await savingsService.updateSavingGoal(req.user._id, req.params.id, req.body);
    res.status(200).json({
        success: true,
        data: goal
    });
};

export const deleteSavingGoal =async (req, res) => {
    await savingsService.deleteSavingGoal(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        message: 'Saving goal deleted successfully'
    });
};

export const addProgress =async (req, res) => {
    const goal = await savingsService.addProgress(req.user._id, req.params.id, req.body);
    res.status(200).json({
        success: true,
        data: goal
    });
};

export const updateProgress =async (req, res) => {
    const goal = await savingsService.updateProgress(req.user._id, req.params.id, req.params.progressId, req.body);
    res.status(200).json({
        success: true,
        data: goal
    });
};

export const deleteProgress =async (req, res) => {
    const goal = await savingsService.deleteProgress(req.user._id, req.params.id, req.params.progressId);
    res.status(200).json({
        success: true,
        data: goal,
        message: 'Progress entry deleted successfully'
    });
};



export const getAPayment =async (req, res) => {
    const payment = await savingsService.getAPayment(req.user._id, req.params.id, req.params.progressId);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: payment
    });
};

export const getGoalInsights = async (req, res) => {
    const { language } = req.query;
    const insights = await savingsService.getGoalInsights(req.user._id, req.params.id, language || 'English');
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: insights
    });
};

export const getSavingsMonthlyTrends = async (req, res) => {
    const stats = await savingsService.getSavingsMonthlyTrends(req.user._id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: stats
    });
};
