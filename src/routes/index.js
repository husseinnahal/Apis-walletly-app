import express from 'express';
import adminRoute from './api/admin.route.js';
import budgetsRoute from './api/budgets.route.js';
import categoriesRoute from './api/categories.route.js';
import authRoute from './api/v1/auth.route.js';
import usersRoute from './api/v1/users.route.js';
import transactionsRoute from './api/transactions.route.js';
import savingsRoute from './api/savings.route.js';
import debtRoute from './api/debt.route.js';
import billRoute from './api/bill.route.js';
import metalsRoute from './api/metals.route.js';
import investmentRoute from './api/investment.route.js';
import chatbotRoute from './api/chatbot.route.js';
import accountRoute from './api/account.route.js';
import gamificationRoute from './api/gamification.route.js';
import notificationRoute from './api/notification.route.js';
import chatRoute from './api/chat.route.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: System
 *   description: System health and API information
 */


router.get('/health', (req, res) => {
     res.status(200).json({
          success: true,
          message: 'Server is healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
     });
});


// API v1 routes
router.use('/api/users', usersRoute);
router.use('/api/auth', authRoute);
router.use('/api/admin', adminRoute);
router.use('/api/categories', categoriesRoute);
router.use('/api/budgets', budgetsRoute);
router.use('/api/transactions', transactionsRoute);
router.use('/api/savings', savingsRoute);
router.use('/api/debt', debtRoute);
router.use('/api/bills', billRoute);
router.use('/api/metals', metalsRoute);
router.use('/api/investments', investmentRoute);
router.use('/api/chatbot', chatbotRoute);
router.use('/api/accounts', accountRoute);
router.use('/api/gamification', gamificationRoute);
router.use('/api/notifications', notificationRoute);
router.use('/api/chats', chatRoute);


/**
 * @swagger
 * /api:
 *   get:
 *     summary: API discovery endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: List of available API modules
 */
router.get('/api', (req, res) => {
     res.status(200).json({
          success: true,
          message: 'API is running',
          version: 'v1',
          endpoints: {
               health: '/health',
               users: '/api/users',
               auth: '/api/auth',
               admin: '/api/admin',
               categories: '/api/categories',
               budgets: '/api/budgets',
               transactions: '/api/transactions',
               savings: '/api/savings',
               debt: '/api/debt',
               bills: '/api/bills',
               metals: '/api/metals',
               investments: '/api/investments',
               chatbot: '/api/chatbot',
               accounts: '/api/accounts',
               gamification: '/api/gamification',
               notifications: '/api/notifications',
               chats: '/api/chats',
          },
     });
});

// 404 handler
router.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

export default router;
