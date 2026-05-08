import express from 'express';
import Joi from 'joi';
import * as billController from '../../controllers/bill.controller.js';
import { protect } from '../../middlewares/auth.js';
import validate, { createSchema } from '../../middlewares/validate.js';

const router = express.Router();



const billSchema = createSchema({
    body: {
        name: Joi.string().required().min(3).messages({
         'string.min': 'Title must be at least 3 characters',
         'any.required': 'Title is required',
        }),
        amount: Joi.number().required().min(0).messages({
        'number.min': 'Goal amount must be positive',
        'any.required': 'Goal amount is required',
        }),  
        dueDate: Joi.date().required().greater('now').messages({
        'date.greater': 'dueDate must be a future date',
        }),    
        isRecurring: Joi.boolean().optional(),
        recurrence: Joi.string().valid('weekly', 'monthly', 'quarterly', 'semiannual', 'yearly',null).optional(),
        reminderDaysBefore: Joi.number().optional().min(0),
        notes: Joi.string().optional().allow(''),
        autoRenew: Joi.boolean().optional(),
        autoPaid: Joi.boolean().optional(),
        currency: Joi.string().required().messages({
            'any.required': 'Currency is required',
        }),
        image: Joi.string().optional().allow(''),
        autoPayAccountId:Joi.string().required().messages({
            'any.required': 'Account ID is required',
        })
    }
});

const paymentSchema = createSchema({
    body: {
        date: Joi.date().optional(),
        accountId: Joi.string().required().messages({
            'any.required': 'Account ID is required',
        }),
    }
});

/**
 * @swagger
 * tags:
 *   name: Bills
 *   description: Recurring bills and subscriptions management
 */

router.use(protect);

/**
 * @swagger
 * /api/bills/stats:
 *   get:
 *     summary: Get bill payment statistics and trends
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bill statistics data
 */
router.get('/stats', billController.getBillStats);

/**
 * @swagger
 * /api/bills:
 *   get:
 *     summary: Get all user bills
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bills
 */
/**
 * @swagger
 * /api/bills:
 *   post:
 *     summary: Create a new bill or subscription
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, amount, dueDate, autoPayAccountId, currency]
 *             properties:
 *               name: { type: string }
 *               amount: { type: number }
 *               dueDate: { type: string, format: date-time }
 *               isRecurring: { type: boolean }
 *               recurrence: { type: string, enum: [weekly, monthly, quarterly, semiannual, yearly] }
 *               autoPayAccountId: { type: string }
 *               currency: { type: string }
 *     responses:
 *       201:
 *         description: Bill created
 */
router.route('/')
    .get(billController.getBills)
    .post(validate(billSchema), billController.createBill);

/**
 * @swagger
 * /api/bills/{id}:
 *   get:
 *     summary: Get bill by ID
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bill data
 */
/**
 * @swagger
 * /api/bills/{id}:
 *   patch:
 *     summary: Update an existing bill
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bill updated
 */
/**
 * @swagger
 * /api/bills/{id}:
 *   delete:
 *     summary: Delete a bill
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bill deleted
 */
router.route('/:id')
    .get(billController.getBillById)
    .patch(validate(billSchema), billController.updateBill)
    .delete(billController.deleteBill);

/**
 * @swagger
 * /api/bills/{id}/pay:
 *   post:
 *     summary: Mark a bill as paid
 *     tags: [Bills]
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
 *             required: [accountId]
 *             properties:
 *               accountId: { type: string }
 *               date: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Bill marked as paid
 */
router.post('/:id/pay', validate(paymentSchema), billController.markAsPaid);

/**
 * @swagger
 * /api/bills/{id}/cancel:
 *   post:
 *     summary: Cancel a recurring bill/subscription
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bill cancelled
 */
router.post('/:id/cancel', billController.cancelBill);

/**
 * @swagger
 * /api/bills/{id}/recurrence:
 *   patch:
 *     summary: Toggle bill recurrence settings
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Recurrence toggled
 */
router.patch('/:id/recurrence', billController.toggleRecurrence);

/**
 * @swagger
 * /api/bills/{id}/auto-paid:
 *   patch:
 *     summary: Toggle automatic payment for a bill
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Auto-paid toggled
 */
router.patch('/:id/auto-paid', billController.toggleAutoPaid);

export default router;
