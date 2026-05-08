import express from 'express';
import Joi from 'joi';
import * as budgetsController from '../../controllers/budgets.controller.js';
import { protect } from '../../middlewares/auth.js';
import validate, { createSchema } from '../../middlewares/validate.js';

const router = express.Router();

const budgetSchema = createSchema({
  body: {
      name: Joi.string()
      .trim()
      .required()
      .min(3)
      .messages({
        'string.min': 'Name must be at least 3 characters',
        'any.required': 'Name is required',
      }),
    category: Joi.string().required().messages({
      'any.required': 'Category is required',
    }),
    amount: Joi.number().required().min(0).messages({
      'number.min': 'Amount must be greater than 0',
      'any.required': 'Amount is required',
    }),
    currency: Joi.string().required().messages({
      'any.required': 'Currency is required',
    }),
    note: Joi.string().optional().allow(''),
    period: Joi.string().valid('weekly', 'monthly', 'quarterly', 'semiannual', 'yearly').default('monthly'),
    startDate: Joi.date().required().messages({
      'any.required': 'Start date is required',
    }),
    endDate: Joi.date().required().greater(Joi.ref('startDate')).messages({
      'any.required': 'End date is required',
      'date.greater': 'End date must be after start date',
    }),
    autoRenew: Joi.boolean().default(true),
    carryOverEnabled: Joi.boolean().default(false),
  },
});

const updatebudgetSchema = createSchema({
  body: {
      name: Joi.string()
      .trim()
      .required()
      .min(3)
      .messages({
        'string.min': 'Name must be at least 3 characters',
        'any.required': 'Name is required',
      }),
    category: Joi.string().required().messages({
      'any.required': 'Category is required',
    }),
    amount: Joi.number().required().min(0).messages({
      'number.min': 'Amount must be greater than 0',
      'any.required': 'Amount is required',
    }),
    currency: Joi.string().required().messages({
      'any.required': 'Currency is required',
    }),
    note: Joi.string().optional().allow(''),
    period: Joi.string().valid('weekly', 'monthly', 'quarterly', 'semiannual', 'yearly'),
    startDate: Joi.date().required().messages({
      'any.required': 'Start date is required',
    }),
    endDate: Joi.date().required().greater(Joi.ref('startDate')).messages({
      'any.required': 'End date is required',
      'date.greater': 'End date must be after start date',
    }),
  },
});

/**
 * @swagger
 * tags:
 *   name: Budgets
 *   description: Category-based budget management
 */

// ALL budget routes require a logged-in user
router.use(protect);

/**
 * @swagger
 * /api/budgets:
 *   get:
 *     summary: Get all user budgets
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of budgets
 */
router.get('/', budgetsController.getMyBudgets);

/**
 * @swagger
 * /api/budgets/{budgetId}:
 *   get:
 *     summary: Get budget by ID
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Budget data
 */
router.get('/:budgetId', budgetsController.getBudget);

/**
 * @swagger
 * /api/budgets:
 *   post:
 *     summary: Create a new budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, amount, currency, startDate, endDate]
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               amount: { type: number }
 *               currency: { type: string }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               period: { type: string, enum: [weekly, monthly, quarterly, semiannual, yearly] }
 *     responses:
 *       201:
 *         description: Budget created
 */
router.post('/', validate(budgetSchema), budgetsController.createBudget);

/**
 * @swagger
 * /api/budgets/{budgetId}:
 *   put:
 *     summary: Update an existing budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Budget updated
 */
router.put('/:budgetId', validate(updatebudgetSchema), budgetsController.updateBudget);

/**
 * @swagger
 * /api/budgets/{budgetId}:
 *   delete:
 *     summary: Delete a budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Budget deleted
 */
router.delete('/:budgetId', budgetsController.deleteBudget);

/**
 * @swagger
 * /api/budgets/{budgetId}/toggle-active:
 *   patch:
 *     summary: Toggle budget active status
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Active status toggled
 */
router.patch('/:budgetId/toggle-active', budgetsController.toggleActive);

/**
 * @swagger
 * /api/budgets/{budgetId}/toggle-renew:
 *   patch:
 *     summary: Toggle budget auto-renewal
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Auto-renew toggled
 */
router.patch('/:budgetId/toggle-renew', budgetsController.toggleRenew);

/**
 * @swagger
 * /api/budgets/{budgetId}/toggle-overamount:
 *   patch:
 *     summary: Toggle budget carry-over (overamount)
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Carry-over toggled
 */
router.patch('/:budgetId/toggle-overamount', budgetsController.toggleOverAmount);

export default router;
