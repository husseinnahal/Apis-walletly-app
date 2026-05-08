import * as billService from '../services/bill.service.js';

export const createBill = async (req, res) => {
    const bill = await billService.createBill(req.user._id, req.body);
    res.status(201).json({
        success: true,
        data: bill
    });
};

export const getBills = async (req, res) => {
    const bills = await billService.getBills(req.user._id, req.query);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: bills
    });
};

export const getBillById = async (req, res) => {
    const bill = await billService.getBillById(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: bill
    });
};

export const updateBill = async (req, res) => {
    const bill = await billService.updateBill(req.user._id, req.params.id, req.body);
    res.status(200).json({
        success: true,
        data: bill,
        message: 'Bill updated successfully'
    });
};

export const markAsPaid = async (req, res) => {
    const bill = await billService.markBillAsPaid(req.user._id, req.params.id, req.body);
    res.status(200).json({
        success: true,
        data: bill,
        message: 'Bill marked as paid and transaction recorded'
    });
};

export const cancelBill = async (req, res) => {
    const bill = await billService.cancelBill(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        data: bill,
        message: 'Bill subscription cancelled'
    });
};

export const deleteBill = async (req, res) => {
    const result = await billService.deleteBill(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        ...result
    });
};

export const toggleRecurrence = async (req, res) => {
    const bill = await billService.toggleRecurrence(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        data: bill,
        message: 'Bill recurrence settings toggled'
    });
};

export const toggleAutoPaid = async (req, res) => {
    const bill = await billService.toggleAutoPaid(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        data: bill,
        message: 'Bill auto-paid setting toggled'
    });
};

export const getBillStats = async (req, res) => {
    const stats = await billService.getBillTrends(req.user._id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: stats
    });
};
