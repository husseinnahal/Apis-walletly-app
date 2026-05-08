import * as investmentService from '../services/investment.service.js';

export const createInvestment = async (req, res) => {
    const investment = await investmentService.createInvestment(req.user._id, req.body);
    res.status(201).json({
        success: true,
        data: investment
    });
};

export const getInvestments = async (req, res) => {
    const { investments, availableCount } = await investmentService.getInvestments(req.user._id, req.query);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: investments,
        availableCount
    });
};

export const getMyInvestments = async (req, res) => {
    const investments = await investmentService.getMyInvestments(req.user._id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: investments
    });
};

export const getInvestmentById = async (req, res) => {
    const investment = await investmentService.getInvestmentById(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: investment
    });
};

export const updateInvestment = async (req, res) => {
    const investment = await investmentService.updateInvestment(req.user._id, req.params.id, req.body);
    res.status(200).json({
        success: true,
        data: investment
    });
};

export const toggleAvailability = async (req, res) => {
    const investment = await investmentService.toggleAvailability(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        data: investment
    });
};

export const deleteInvestment = async (req, res) => {
    await investmentService.deleteInvestment(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        message: 'Investment opportunity deleted successfully'
    });
};
