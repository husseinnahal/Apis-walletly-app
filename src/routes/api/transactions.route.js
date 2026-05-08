import express from 'express';
import Joi from 'joi';
import * as transactionsController from '../../controllers/transactions.controller.js';
import { protect } from '../../middlewares/auth.js';
import validate, { createSchema } from '../../middlewares/validate.js';

import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const transactionSchema = createSchema({
  body: {
    category: Joi.string().required().messages({
      'any.required': 'Category is required',
    }),
      account: Joi.string().required().messages({
      'any.required': 'choose an account ',
    }),
    title: Joi.string().required().min(3).max(30).messages({
      'any.required': 'Title is required',
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title must be at most 30 characters',
    }),
    amount: Joi.number().required().min(0).messages({
      'number.min': 'Amount must be a positive number',
      'any.required': 'Amount is required',
    }),
    type: Joi.string().valid('expense', 'income').required().messages({
      'any.required': 'Transaction type is required',
      'any.only': 'Transaction type must be expense or income',
    }),
    date: Joi.date().required().messages({
      'any.required': 'Date is required',
    }),
    note: Joi.string().optional().allow(''),
    currency: Joi.string().required().messages({
      'any.required': 'Currency is required',
    }),    
  },
});

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Personal financial transactions management
 */

router.use(protect);

/**
 * @swagger
 * /api/transactions/ai-parse:
 *   post:
 *     summary: Parse transactions from voice audio
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Transactions parsed and saved
 */
router.post('/ai-parse', upload.single('audio'), transactionsController.aiParseTransactions);

/**
 * @swagger
 * /api/transactions/stats/daily:
 *   get:
 *     summary: Get daily spending/income statistics
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily stats object
 */
router.get('/stats/daily', transactionsController.getDailyStats);

/**
 * @swagger
 * /api/transactions/stats/trends:
 *   get:
 *     summary: Get monthly transaction trends
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly trends data
 */
router.get('/stats/trends', transactionsController.getMonthlyTrends);

/**
 * @swagger
 * /api/transactions/stats/categories:
 *   get:
 *     summary: Get transaction breakdown by category
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category stats data
 */
router.get('/stats/categories', transactionsController.getCategoryStats);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get('/', transactionsController.getTransactions);

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, account, title, amount, type, date, currency]
 *             properties:
 *               category: { type: string }
 *               account: { type: string }
 *               title: { type: string }
 *               amount: { type: number }
 *               type: { type: string, enum: [income, expense] }
 *               date: { type: string, format: date }
 *               currency: { type: string }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Transaction created
 */
router.post('/', validate(transactionSchema), transactionsController.createTransaction);

/**
 * @swagger
 * /api/transactions/{transactionId}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction data
 */
router.get('/:transactionId', transactionsController.getTransactionById);

/**
 * @swagger
 * /api/transactions/{transactionId}:
 *   put:
 *     summary: Update an existing transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               amount: { type: number }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Transaction updated
 */
router.put('/:transactionId', validate(transactionSchema), transactionsController.updateTransaction);

/**
 * @swagger
 * /api/transactions/{transactionId}:
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction deleted
 */
router.delete('/:transactionId', transactionsController.deleteTransaction);

export default router;
