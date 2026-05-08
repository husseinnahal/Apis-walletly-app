import express from 'express';
import Joi from 'joi';
import * as accountController from '../../controllers/account.controller.js';
import { protect } from '../../middlewares/auth.js';
import validate, { createSchema } from '../../middlewares/validate.js';

const router = express.Router();

const accountValidation = createSchema({
    body: {
        name: Joi.string().required().messages({
            'any.required': 'Name is required',
        }),
        initialBalance: Joi.number().default(0),
        currency: Joi.string().required().messages({
            'any.required': 'Currency is required',
        }),
    }
});

const transferValidation = createSchema({
    body: {
        fromAccountId: Joi.string().required().messages({
            'any.required': 'From account ID is required',
        }),
        toAccountId: Joi.string().required().messages({
            'any.required': 'To account ID is required',
        }),
        amount: Joi.number().required().min(0.1).messages({
            'any.required': 'Amount is required',
            'number.min': 'Amount must be a positive number',
        }),
        currency: Joi.string().required().messages({
            'any.required': 'Currency is required',
        }),
        date: Joi.date().required().messages({
            'any.required': 'Date is required',
    }),  
    }
});

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Bank accounts, wallets, and cash management
 */

router.use(protect);

/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: Get all user accounts
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of accounts
 */
/**
 * @swagger
 * /api/accounts:
 *   post:
 *     summary: Create a new financial account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, currency]
 *             properties:
 *               name: { type: string, example: "Main Bank" }
 *               initialBalance: { type: number, default: 0 }
 *               currency: { type: string, example: "USD" }
 *     responses:
 *       201:
 *         description: Account created
 */
router.route('/')
    .post(validate(accountValidation), accountController.createAccount)
    .get(accountController.getAccounts);

/**
 * @swagger
 * /api/accounts/transfer:
 *   post:
 *     summary: Transfer funds between two accounts
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromAccountId, toAccountId, amount, currency, date]
 *             properties:
 *               fromAccountId: { type: string }
 *               toAccountId: { type: string }
 *               amount: { type: number }
 *               currency: { type: string }
 *               date: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Transfer successful
 */
router.post('/transfer', validate(transferValidation), accountController.transferFunds);

/**
 * @swagger
 * /api/accounts/{accountId}:
 *   get:
 *     summary: Get account by ID
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Account data
 */
/**
 * @swagger
 * /api/accounts/{accountId}:
 *   patch:
 *     summary: Update an account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Account updated
 */
/**
 * @swagger
 * /api/accounts/{accountId}:
 *   delete:
 *     summary: Delete an account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.route('/:accountId')
    .get(accountController.getAccount)
    .patch(validate(accountValidation), accountController.updateAccount)
    .delete(accountController.deleteAccount);

export default router;
