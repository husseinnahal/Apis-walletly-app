import * as debtService from '../services/debt.service.js';
import * as aiService from '../services/ai.service.js';

export const createDebt = async (req, res) => {
    const debt = await debtService.createDebt(req.user._id, req.body);
    res.status(201).json({
        success: true,
        data: debt
    });
};

export const getDebts = async (req, res) => {
    const debtsData = await debtService.getDebts(req.user._id, req.query);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: debtsData
    });
};

export const getDebtById = async (req, res) => {
    const debt = await debtService.getDebtById(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: debt
    });
};

export const addPayment = async (req, res) => {
    const debt = await debtService.addPayment(req.user._id, req.params.id, req.body);
    res.status(200).json({
        success: true,
        data: debt,
        message: 'Payment added and transaction synchronized'
    });
};

export const deleteDebt = async (req, res) => {
    const result = await debtService.deleteDebt(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        ...result
    });
};

export const deletePayment = async (req, res) => {
    const debt = await debtService.deletePayment(req.user._id, req.params.id, req.params.paymentId);
    res.status(200).json({
        success: true,
        data: debt,
        message: 'Payment removed and transaction reversed'
    });
};

export const updateDebt = async (req, res) => {
    const debt = await debtService.updateDebt(req.user._id, req.params.id, req.body);
    res.status(200).json({
        success: true,
        data: debt,
        message: 'Debt updated successfully'
    });
};

export const updatePayment = async (req, res) => {
    const debt = await debtService.updatePayment(req.user._id, req.params.id, req.params.paymentId, req.body);
    res.status(200).json({
        success: true,
        data: debt,
        message: 'Payment updated and transaction synchronized'
    });
};

export const getAPayment =async (req, res) => {
    const payment = await debtService.getAPayment(req.user._id, req.params.id, req.params.paymentId);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: payment
    });
};

export const getDebtInsights = async (req, res) => {
    try {
        const debt = await debtService.getDebtById(req.user._id, req.params.id);
        const insights = await aiService.getDebtInsights(debt, req.user.settings?.language || 'English');
        
        res.status(200).json({
            success: true,
            currency: req.user.currency,
            currencyRate: req.user.currencyRate,
            data: insights
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to get AI insights'
        });
    }
};

export const getDebtStats = async (req, res) => {
    const stats = await debtService.getDebtMonthlyTrends(req.user._id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: stats
    });
};