import express from 'express';
import Joi from 'joi';
import * as metalController from '../../controllers/metals.controller.js';
import validate, { createSchema } from '../../middlewares/validate.js';
import { protect } from '../../middlewares/auth.js';

const router = express.Router();

// it is the api to get the data of charts
// https://api.gold-api.com/history?symbol=XAU&groupBy=day&startTimestamp=1771053764&endTimestamp=1771485764
// it is api key for charts
// 6009ef0e83080d59de9c3fa534352228df0eb9d59bf12b515835e290995be038

// Live price APIs
//https://api.gold-api.com/price/XAU/USD
// https://api.gold-api.com/price/XAG/USD


// Validation Schemas
const metalSchema = createSchema({
    body: {
        type: Joi.string().valid('gold', 'silver').required().messages({
            'any.required': 'Please select a metal type.',
            'string.empty': 'Metal type cannot be empty.',
            'any.only': 'Type must be either gold or silver.'
        }),

        form: Joi.string().when('type', {
            is: 'gold',
            then: Joi.valid('gram', 'ounce', 'lira'),
            otherwise: Joi.valid('gram', 'ounce') // no lira for silver
        }).default('gram').messages({
            'any.required': 'Please select a form.',
            'string.empty': 'Form cannot be empty.',
            'any.only': 'Invalid form for the selected metal type.'
        }),

        purity: Joi.string().valid('18k', '21k', '24k').when('type', {
            is: 'gold',
            then: Joi.when('form', {
                is: 'gram',
                then: Joi.required().messages({
                    'any.required': 'Purity is required for gold in gram form.',
                    'string.empty': 'Please choose a purity level.',
                    'any.only': 'Purity must be 18k, 21k, or 24k.'
                }),
                otherwise: Joi.optional()
            }),
            otherwise: Joi.optional()
        }),

        liraType: Joi.string().valid('quarter', 'half', 'full').when('form', {
            is: 'lira',
            then: Joi.required().messages({
                'any.required': 'Lira Type is required.',
                'string.empty': 'Lira type cannot be empty.',
                'any.only': 'Lira type must be quarter, half, or full.'
            }),
            otherwise: Joi.optional()
        }),

        quantity: Joi.number().min(1).default(1).messages({
            'number.min': 'Quantity must be at least 1.'
        }),

        weight: Joi.number().when('form', {
            is: Joi.valid('gram', 'ounce'),
            then: Joi.number().required().min(0.1).messages({
                'any.required': 'Weight is required',
                'number.base': 'Weight must be a number.',
                'number.min': 'Weight must be at least 0.1.'
            }),
            otherwise: Joi.number().optional()
        }),

        price: Joi.number().min(1).required().messages({
            'any.required': 'Price is required.',
            'number.base': 'Price must be a number.',
            'number.min': 'Price must be at least 1.'
        }),
        note: Joi.string().allow('').optional(),
        date: Joi.date().required().messages({
            'any.required': 'Date is required.',
            'date.base': 'Date must be a valid date.'
        }),
        currency: Joi.string().required().messages({
            'any.required': 'Currency is required',
        }),
        accountId: Joi.string().required().messages({
        'any.required': 'Account ID is required',
        }),
    }
});


/**
 * @swagger
 * tags:
 *   name: Metals
 *   description: Precious metals (Gold & Silver) assets tracking
 */

// Protect all routes
router.use(protect);

/**
 * @swagger
 * /api/metals:
 *   get:
 *     summary: Get all user metal assets
 *     tags: [Metals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [gold, silver] }
 *     responses:
 *       200:
 *         description: List of metal assets
 */
/**
 * @swagger
 * /api/metals:
 *   post:
 *     summary: Add a new metal asset (gold or silver)
 *     tags: [Metals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, price, date, currency, accountId]
 *             properties:
 *               type: { type: string, enum: [gold, silver] }
 *               form: { type: string, enum: [gram, ounce, lira] }
 *               purity: { type: string, enum: [18k, 21k, 24k] }
 *               liraType: { type: string, enum: [quarter, half, full] }
 *               quantity: { type: number }
 *               weight: { type: number }
 *               price: { type: number }
 *               currency: { type: string }
 *               accountId: { type: string }
 *               date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Metal asset added
 */
router.route('/')
    .post(validate(metalSchema), metalController.addMetal)
    .get(metalController.getMetals);

/**
 * @swagger
 * /api/metals/stats:
 *   get:
 *     summary: Get statistics and totals for metal assets
 *     tags: [Metals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metals stats
 */
router.get('/stats', metalController.getMetalStats);

/**
 * @swagger
 * /api/metals/{id}:
 *   get:
 *     summary: Get metal asset by ID
 *     tags: [Metals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Metal asset data
 */
/**
 * @swagger
 * /api/metals/{id}:
 *   put:
 *     summary: Update a metal asset
 *     tags: [Metals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Metal asset updated
 */
/**
 * @swagger
 * /api/metals/{id}:
 *   delete:
 *     summary: Delete a metal asset
 *     tags: [Metals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Metal asset deleted
 */
router.route('/:id')
    .get(metalController.getMetalById)
    .put(validate(metalSchema), metalController.updateMetal)
    .delete(metalController.deleteMetal);

export default router;
