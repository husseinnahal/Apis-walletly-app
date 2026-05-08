import express from 'express';
import * as debtController from '../../controllers/debt.controller.js';
import { protect } from '../../middlewares/auth.js';
import validate, { createSchema } from '../../middlewares/validate.js';
import Joi from 'joi';


const router = express.Router();

const debtSchema = createSchema({
  body: {
      person: Joi.string()
      .trim()
      .required()
      .min(3)
      .messages({
        'string.min': 'Person name must be at least 3 characters',
        'any.required': 'Person name is required',
      }),
    amount: Joi.number().required().min(0).messages({
      'number.min': 'Amount must be greater than 0',
      'any.required': 'Amount is required',
    }),
    currency: Joi.string().required().messages({
      'any.required': 'Currency is required',
    }),
    interestRate: Joi.number().optional().min(0).messages({
      'number.min': 'Interest rate must be a positive number',
    }),
    note: Joi.string().optional().allow(''),

    type: Joi.string().valid("debt", "credit").required().messages({
      'any.only': 'Type must be either "debt" or "credit"',
      'any.required': 'Type is required',
    }),
    dueDate: Joi.date().optional(),

  },
});

const progressSchema = createSchema({
  body: {
    amount: Joi.number().required().min(0).messages({
      'number.min': 'Amount must be positive',
      'any.required': 'Amount is required',
    }),
    currency: Joi.string().required().messages({
      'any.required': 'Currency is required',
    }),
    date: Joi.date().required().messages({
      'any.required': 'Date is required',
    }),  
     accountId: Joi.string().required().messages({
      'any.required': 'Account ID is required',
    }),
  },
});

/**
 * @swagger
 * tags:
 *   name: Debts
 *   description: Debt and credit management with payment tracking
 */

router.use(protect);// All debt routes require authentication

/**
 * @swagger
 * /api/debt/stats:
 *   get:
 *     summary: Get debt/credit monthly statistics
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly debt statistics
 */
router.get('/stats', debtController.getDebtStats);

/**
 * @swagger
 * /api/debt:
 *   get:
 *     summary: Get all debts and credits
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of debts and credits
 */
/**
 * @swagger
 * /api/debt:
 *   post:
 *     summary: Create a new debt or credit entry
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [person, amount, currency, type]
 *             properties:
 *               person: { type: string, example: "John Smith" }
 *               amount: { type: number }
 *               currency: { type: string }
 *               type: { type: string, enum: [debt, credit] }
 *               interestRate: { type: number }
 *               dueDate: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Debt created
 */
router.route('/')
    .get(debtController.getDebts)
    .post(validate(debtSchema),debtController.createDebt);

/**
 * @swagger
 * /api/debt/{id}:
 *   get:
 *     summary: Get debt by ID
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Debt data
 */
/**
 * @swagger
 * /api/debt/{id}:
 *   patch:
 *     summary: Update a debt entry
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Debt updated
 */
/**
 * @swagger
 * /api/debt/{id}:
 *   delete:
 *     summary: Delete a debt entry
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Debt deleted
 */
router.route('/:id')
    .get(debtController.getDebtById)
    .patch(validate(debtSchema), debtController.updateDebt)
    .delete(debtController.deleteDebt);

/**
 * @swagger
 * /api/debt/{id}/insights:
 *   get:
 *     summary: Get AI insights for a debt
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: AI-generated insights
 */
router.get('/:id/insights', debtController.getDebtInsights);

/**
 * @swagger
 * /api/debt/{id}/payments:
 *   post:
 *     summary: Add a payment to a debt/credit
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, currency, accountId]
 *             properties:
 *               amount: { type: number }
 *               currency: { type: string }
 *               accountId: { type: string }
 *               date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Payment added
 */
router.post('/:id/payments', validate(progressSchema), debtController.addPayment);

/**
 * @swagger
 * /api/debt/{id}/payments/{paymentId}:
 *   get:
 *     summary: Get a specific debt payment
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment data
 */
/**
 * @swagger
 * /api/debt/{id}/payments/{paymentId}:
 *   patch:
 *     summary: Update a debt payment
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment updated
 */
/**
 * @swagger
 * /api/debt/{id}/payments/{paymentId}:
 *   delete:
 *     summary: Delete a debt payment
 *     tags: [Debts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment deleted
 */
router.route('/:id/payments/:paymentId')
    .get(debtController.getAPayment)
    .patch(validate(progressSchema), debtController.updatePayment)
    .delete(debtController.deletePayment);

export default router;
