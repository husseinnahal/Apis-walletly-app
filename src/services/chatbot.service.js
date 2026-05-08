import Transaction from '../models/transactions.model.js';
import Budget from '../models/budgets.model.js';
import Saving from '../models/saving.model.js';
import Debt from '../models/debt.model.js';
import Bill from '../models/bills.model.js';
import Metal from '../models/metals.model.js';
import Investment from '../models/investment.model.js';
import Account from '../models/accounts.model.js';
import * as aiService from './ai.service.js';
import * as metalService from './metals.service.js';

/**
 * Aggregates all user financial data to provide context for the AI
 */
export const getUserFinancialContext = async (userId) => {
    const [
        transactions,
        budgets,
        savings,
        debts,
        bills,
        metals,
        myInvestments,
        metalStats,
        accounts
    ] = await Promise.all([
        Transaction.find({ userId }).sort({ date: -1 }).limit(50).lean(), // Last 50 transactions
        Budget.find({ userId }).lean(),
        Saving.find({ userId }).lean(),
        Debt.find({ userId }).lean(),
        Bill.find({ userId }).lean(),
        Metal.find({ userId }).lean(),
        Investment.find({ userId }).lean(),
        metalService.getMetalStats(userId).catch(() => null), // Get detailed metal profits/market value
        Account.find({ user: userId }).lean()
    ]);

    // --- CALCULATIONS ---

    // 1. Transaction Stats
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // 2. Bills Stats
    const totalPaidBills = bills.filter(b => b.isPaid).reduce((sum, b) => sum + b.amount, 0);
    const totalUnpaidBills = bills.filter(b => !b.isPaid).reduce((sum, b) => sum + b.amount, 0);

    // 3. Savings Stats
    const totalSavingsTarget = savings.reduce((sum, s) => sum + s.amount, 0);
    const totalSavedAmount = savings.reduce((sum, s) => sum + s.total, 0);
    const totalSavingsRemaining = totalSavingsTarget - totalSavedAmount;

    // 4. Debt Stats
    const totalDebtPrincipal = debts.filter(d => d.type === 'debt').reduce((sum, d) => sum + d.amount, 0);
    const totalDebtRemaining = debts.filter(d => d.type === 'debt').reduce((sum, d) => sum + (d.amount - d.total), 0);
    const totalMoneyIOwe = totalDebtRemaining;
    const totalMoneyPeopleOweMe = debts.filter(d => d.type === 'credit').reduce((sum, d) => sum + (d.amount - d.total), 0);

    // 5. Metals Stats (Detailed Grouping)
    const metalsSummary = {
        gold: { gram: 0, ounce: 0, lira: 0, totalValue: 0 },
        silver: { gram: 0, ounce: 0, lira: 0, totalValue: 0 }
    };

    metals.forEach(m => {
        const type = m.type; // gold or silver
        const form = m.form; // gram, ounce, lira
        const amount = (form === 'lira') ? m.quantity : m.weight;
        
        if (metalsSummary[type] && metalsSummary[type][form] !== undefined) {
            metalsSummary[type][form] += amount;
            metalsSummary[type].totalValue += m.price;
        }
    });

    // Format for AI
    return {
        financialTotals: {
            incomeInLast50Transactions: totalIncome,
            expenseInLast50Transactions: totalExpense,
            netCashFlow: totalIncome - totalExpense,
            totalMoneyIOwe: totalMoneyIOwe,
            totalMoneyOwedToMe: totalMoneyPeopleOweMe,
            totalUnpaidBillsAmount: totalUnpaidBills,
            totalPaidBillsAmount: totalPaidBills,
            totalSavedInGoals: totalSavedAmount,
            totalRemainingToReachSavingGoals: totalSavingsRemaining,
            savingProgressPercentage: totalSavingsTarget > 0 ? ((totalSavedAmount / totalSavingsTarget) * 100).toFixed(2) : 0,
            totalAccountBalance: accounts.reduce((sum, a) => sum + a.totalBalance, 0)
        },
        financialAccounts: accounts.map(a => ({
            name: a.name,
            balance: a.totalBalance
        })),
        metalsDetailedHoldings: metalsSummary,
        metalsMarketAnalysis: metalStats ? {
            gold: {
                currentMarketValue: metalStats.gold.totalValue,
                originalPurchasePrice: metalStats.gold.totalSpent,
                profitOrLoss: metalStats.gold.totalValue - metalStats.gold.totalSpent
            },
            silver: {
                currentMarketValue: metalStats.silver.totalValue,
                originalPurchasePrice: metalStats.silver.totalSpent,
                profitOrLoss: metalStats.silver.totalValue - metalStats.silver.totalSpent
            },
            marketplacePrices: {
                goldPerGram24k: metalStats.gold.marketplace[24],
                silverPerGram: metalStats.silver.marketplace
            }
        } : null,
        recentActivity: transactions.map(t => ({
            title: t.title,
            amount: t.amount,
            type: t.type,
            date: t.date,
            category: t.category
        })),
        activeBudgets: budgets.map(b => ({
            name: b.name,
            limit: b.amount,
            spent: b.spent,
            remaining: b.amount - b.spent
        })),
        savingGoals: savings.map(s => ({
            title: s.title,
            target: s.amount,
            saved: s.total,
            remaining: s.amount - s.total,
            deadline: s.deadline
        })),
        debtsAndCredits: debts.map(d => ({
            person: d.person,
            type: d.type,
            amount: d.amount,
            remaining: d.amount - d.total,
            dueDate: d.dueDate
        })),
        bills: bills.map(b => ({
            name: b.name,
            amount: b.amount,
            isPaid: b.isPaid,
            dueDate: b.dueDate
        })),
        marketplaceInvestments: myInvestments.map(i => ({
            title: i.title,
            requiredAmount: i.requiredAmount,
            investmentType: i.investmentType,
            views: i.views
        }))
    };
};

/**
 * Main chatbot handler
 */
export const processChatQuery = async (userId, userMessage, history, language) => {
    const context = await getUserFinancialContext(userId);
    const response = await aiService.getChatbotResponse(context, userMessage, history, language);
    return response;
};
