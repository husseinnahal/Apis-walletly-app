import * as accountService from '../services/account.service.js';

export const createAccount = async (req, res) => {
    const account = await accountService.createAccount(req.user._id, req.body);
    res.status(201).json({
        success: true,
        data: account
    });
};

export const getAccounts = async (req, res) => {
    const accounts = await accountService.getAccounts(req.user._id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: accounts
    });
};

export const getAccount = async (req, res) => {
    const account = await accountService.getAccountById(req.user._id, req.params.accountId);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: account
    });
};

export const updateAccount = async (req, res) => {
    const account = await accountService.updateAccount(req.user._id, req.params.accountId, req.body);
    res.status(200).json({
        success: true,
        data: account
    });
};

export const deleteAccount = async (req, res) => {
    await accountService.deleteAccount(req.user._id, req.params.accountId);
    res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
    });
};

export const transferFunds = async (req, res) => {
    const { fromAccountId, toAccountId, amount, note } = req.body;
    const result = await accountService.transferFunds(req.user._id, fromAccountId, toAccountId, amount, note);
    res.status(200).json({
        success: true,
        message: 'Transfer successful',
        data: result
    });
};
