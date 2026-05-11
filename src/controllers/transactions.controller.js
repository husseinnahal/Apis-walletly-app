import * as transactionsService from '../services/transactions.service.js';
import axios from 'axios';



export const createTransaction = async (req, res) => {
    const transaction = await transactionsService.createTransaction(req.user._id, req.body);
    res.status(201).json({ 
        success: true, 
        message: 'Transaction created successfully',
        data: transaction 
    });
};

export const getTransactions = async (req, res) => {
    const transactions = await transactionsService.getTransactions(req.user._id, req.query);
    res.status(200).json({ 
        success: true, 
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: transactions 
    });
};

export const getTransactionById = async (req, res) => {
    const transaction = await transactionsService.getTransactionById(req.user._id, req.params.transactionId);
    res.status(200).json({ 
        success: true, 
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: transaction 
    });
};

export const updateTransaction = async (req, res) => {
    const transaction = await transactionsService.updateTransaction(req.user._id, req.params.transactionId, req.body);
    res.status(200).json({ 
        success: true, 
        message: 'Transaction updated successfully',
        data: transaction 
    });
};

export const deleteTransaction = async (req, res) => {
    await transactionsService.deleteTransaction(req.user._id, req.params.transactionId);
    res.status(200).json({ 
        success: true, 
        message: 'Transaction deleted successfully' 
    });
};

import * as aiService from '../services/ai.service.js';
import Category from '../models/categories.model.js';
import Account from '../models/accounts.model.js';
import ApiError from '../utils/ApiError.js';

export const aiParseTransactions = async (req, res) => {
    if (!req.file) {
        throw ApiError.badRequest('Audio file is required');
    }

    const { language } = req.body;

    // Fetch the user's categories and accounts to pass to the AI for accurate mapping
    const [categories, accounts] = await Promise.all([
        Category.find({ $or: [{ isDefault: true }, { user: req.user._id }] }),
        Account.find({ user: req.user._id })
    ]);

    const parsedTransactions = await aiService.parseVoiceTransactions(req.file.path, categories, accounts, language);
    
    if (!parsedTransactions || parsedTransactions.length === 0) {
        return res.status(200).json({
            success: true,
            data: [],
            message: 'No transactions detected in the audio.'
        });
    }

    // Determine if we need to fetch global rates (if they spoke a foreign currency)
    let globalRates = null;
    const hasForeignCurrency = parsedTransactions.some(tx => tx.currencyCode && tx.currencyCode.toUpperCase() !== req.user.currency);
    
    if (hasForeignCurrency) {
        try {
            const response = await axios.get('https://open.er-api.com/v6/latest/USD');
            if (response.data && response.data.rates) {
                globalRates = response.data.rates;
            }
        } catch (err) {
            console.error('Failed to fetch exchange rates for AI parser:', err.message);
        }
    }

    const savedTransactions = [];
    
    // Save each parsed transaction automatically
    for (const tx of parsedTransactions) {
        let categoryId = tx.category;

        // If AI suggested a new category because none fit
        if (!categoryId && tx.newCategoryName) {
            // Check if it already exists to prevent duplicates
            const existingCat = await Category.findOne({ 
                $or: [
                    { isDefault: true },
                    { user: req.user._id }
                ]
                , name: { $regex: new RegExp(`^${tx.newCategoryName}$`, 'i') } });
            if (existingCat) {
                categoryId = existingCat._id;
            } else {
                // Create the new category
                const newCat = await Category.create({
                    name: tx.newCategoryName,
                    user: req.user._id,
                    icon: tx.newCategoryIcon || '✨',
                });
                categoryId = newCat._id;
                // Add to our list so subsequent transactions in this batch can use it
                categories.push(newCat);
            }
        }

        // Fallback if STILL no category
        if (!categoryId && categories.length > 0) {
            categoryId = categories[0]._id;
        }

        // Accurately convert the amount to USD
        let finalAmountInUSD = 0;
        const spokenCode = tx.currencyCode ? tx.currencyCode.toUpperCase() : null;

        if (spokenCode && spokenCode !== req.user.currency && globalRates && globalRates[spokenCode]) {
            // They explicitly spoke a different currency, divide by its specific USD rate
            finalAmountInUSD = Number(tx.amount) / globalRates[spokenCode];
        } else {
            // They didn't mention a currency, or mentioned their default currency
            finalAmountInUSD = Number(tx.amount) / req.user.currencyRate;
        }

        const payload = {
            title: tx.title || 'Voice Transaction',
            amount: Number(finalAmountInUSD.toFixed(2)) || 0,
            type: tx.type === 'income' ? 'income' : 'expense',
            category: categoryId,
            account: tx.account || accounts[0]._id ,
            note: tx.note || '',
            date: tx.date ? new Date(tx.date) : new Date()
        };

        const savedTx = await transactionsService.createTransaction(req.user._id, payload);
        savedTransactions.push(savedTx);
    }

    res.status(200).json({
        success: true,
        data: savedTransactions,
        message: `Successfully saved ${savedTransactions.length} transaction(s)!`
    });
};

export const getDailyStats = async (req, res) => {
    const stats = await transactionsService.getDailyStats(req.user._id, req.query);
    res.status(200).json({ 
        success: true, 
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: stats 
    });
};

export const getMonthlyTrends = async (req, res) => {
    const stats = await transactionsService.getMonthlyTrends(req.user._id, req.query);
    res.status(200).json({ 
        success: true, 
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: stats 
    });
};

export const getCategoryStats = async (req, res) => {
    const stats = await transactionsService.getCategoryBreakdown(req.user._id, req.query);
    res.status(200).json({ 
        success: true, 
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: stats 
    });
};
