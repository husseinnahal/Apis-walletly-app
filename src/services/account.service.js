import Account from '../models/accounts.model.js';
import Transaction from '../models/transactions.model.js';
import Category from '../models/categories.model.js';
import ApiError from '../utils/ApiError.js';
import mongoose from 'mongoose';
import axios from 'axios';

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
/**
 * Create a new account
 */
export const createAccount = async (userId, accountData) => {
    // Check if account with same name already exists for this user
    const existingAccount = await Account.findOne({ user: userId, name: accountData.name });
    if (existingAccount) {
        throw ApiError.badRequest('Account with this name already exists');
    }
    const currency = accountData.currency;
    const amountInUSD = await convertToUSD(accountData.initialBalance, currency);

    const account = await Account.create({
        ...accountData,
        user: userId,
        initialBalance:amountInUSD || 0,
        totalBalance: amountInUSD || 0
    });
    return account;
};

/**
 * Get all accounts for a user
 */
export const getAccounts = async (userId) => {
    const accounts = await Account.find({ user: userId }).sort({ createdAt: -1 });
    const totalLiquidity = accounts.reduce((acc, curr) => acc + (curr.totalBalance || 0), 0);
    
    return {
        accounts,
        totalLiquidity: Number(totalLiquidity.toFixed(2))
    };
};

/**
 * Get single account
 */
export const getAccountById = async (userId, accountId) => {
    const account = await Account.findOne({ _id: accountId, user: userId });
    if (!account) throw ApiError.notFound('Account not found');
    return account;
};

/**
 * Update account
 */
export const updateAccount = async (userId, accountId, updateData) => {
    const account = await Account.findOne({ _id: accountId, user: userId });
    if (!account) throw ApiError.notFound('Account not found');

    if (updateData.initialBalance !== undefined) {
        const currency = updateData.currency || 'USD';
        const newInitialBalanceUSD = await convertToUSD(updateData.initialBalance, currency);
        
        // Calculate the difference and update totalBalance
        const diff = newInitialBalanceUSD - account.initialBalance;
        account.totalBalance += diff;
        account.initialBalance = newInitialBalanceUSD;
        
        // Remove initialBalance from updateData since we handled it
        delete updateData.initialBalance;
    }

    if (updateData.name) {
        account.name = updateData.name;
    }

    // Apply any other updates
    Object.assign(account, updateData);
    
    await account.save();
    return account;
};

/**
 * Delete account
 */
export const deleteAccount = async (userId, accountId) => {
    const account = await Account.findOne({ _id: accountId, user: userId });
    if (!account) throw ApiError.notFound('Account not found');

    // Optionally check if account has transactions before deleting
    const transactionCount = await Transaction.countDocuments({ account: accountId });
    if (transactionCount > 0) {
        throw ApiError.badRequest('Cannot delete account with existing transactions');
    }

    await account.deleteOne();
    return account;
};

/**
 * Transfer funds between accounts
 */
export const transferFunds = async (userId, fromAccountId, toAccountId, amount, currency,date ) => {
    if (fromAccountId === toAccountId) {
        throw ApiError.badRequest('Cannot transfer to the same account');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const fromAccount = await Account.findOne({ _id: fromAccountId, user: userId }).session(session);
        const toAccount = await Account.findOne({ _id: toAccountId, user: userId }).session(session);

        if (!fromAccount || !toAccount) {
            throw ApiError.notFound('One or both accounts not found');
        }
        const amountInUSD = await convertToUSD(amount, currency);

        if (fromAccount.totalBalance < amountInUSD) {
            throw ApiError.badRequest('Insufficient balance in source account');
        }

        // 1. Update Balances
        fromAccount.totalBalance -= amountInUSD;
        toAccount.totalBalance += amountInUSD;

        await fromAccount.save({ session });
        await toAccount.save({ session });

        // 2. Get/Create a Transfer Category
        let category = await Category.findOne({ name: 'Transfer', isDefault: true }).session(session);
        if (!category) {
            category = await Category.findOne({ isDefault: true }).session(session);
        }

        // 3. Create Transactions
        await Transaction.create([{
            user: userId,
            account: fromAccountId,
            category: category?._id,
            title: `Transfer`,
            amount: amountInUSD,
            type: 'transfer',
            note: `Transfer from ${fromAccount.name} to ${toAccount.name}`,
            date: date || new Date(),
        }], { session });

        await session.commitTransaction();
        return { fromAccount, toAccount };

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};
