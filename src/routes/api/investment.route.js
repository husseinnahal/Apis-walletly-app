import express from 'express';
import Joi from 'joi';
import * as investmentController from '../../controllers/investment.controller.js';
import { protect } from '../../middlewares/auth.js';
import validate, { createSchema } from '../../middlewares/validate.js';


const router = express.Router();

// Validation Schemas
const investmentValidation = createSchema({
    body: {
        title: Joi.string().required().min(3).max(50).messages({
            'any.required': 'Title is required',
            'string.min': 'Title must be at least 3 characters ',
            'string.max': 'Title cannot exceed 50 characters',
            'string.empty': 'Title cannot be empty'
        }),
        description: Joi.string().required().min(6).messages({
            'any.required': 'Description is required',
            'string.min': 'Description must be at least 6 characters',
            'string.empty': 'Description cannot be empty'
        }),
        category: Joi.string().valid('tech', 'food', 'ecommerce', 'service', 'other').default('other'),
        
        investmentType: Joi.string().valid('equity', 'loan', 'partnership').required().messages({
            'any.required': 'Investment type is required',
            'any.only': 'Invalid investment type'
        }),

        requiredAmount: Joi.number().when('investmentType', {
            is: 'partnership',
            then: Joi.number().min(0).required().messages({
                'any.required': 'Amount is required (you can set 0 for partnerships).',
                'number.base': 'Amount must be a number.',
                'number.min': 'Amount cannot be negative.'
            }),
            otherwise: Joi.number().min(10).required().messages({
                'any.required': 'Required amount is required.',
                'number.base': 'Amount must be a number.',
                'number.min': 'Minimum investment amount must be at least 10.'
            })
        }),

        equityOffered: Joi.number().min(0).max(100).when('investmentType', {
            is: 'equity',
            then: Joi.number().min(0).required().messages({
                'any.required': 'equity Offered is required.',
                'number.base': 'equity Offered must be a number.',
                'number.min': 'equity Offered cannot be negative.',
                'number.max': 'equity Offered cannot exceed 100%.'
            }),
            otherwise: Joi.optional()
        }),

        expectedReturn: Joi.number().when('investmentType', {
            is: 'loan',
            then: Joi.number().min(0).required().messages({
                'any.required': 'Expected return is required.',
                'number.base': 'Expected return must be a number.',
                'number.min': 'Expected return cannot be negative.'
            }),
            otherwise: Joi.optional()
        }),
        durationMonths: Joi.number().when('investmentType', {
            is: 'loan',
            then: Joi.number().min(0).required().messages({
                'any.required': 'Duration in months is required.',
                'number.base': 'Duration must be a number.',
                'number.min': 'Duration cannot be negative.'
            }),
            otherwise: Joi.optional()
        }),

        stage: Joi.string().valid('idea', 'mvp', 'launched').default('idea'),
        minInvestment: Joi.number().min(0).default(0),

    }
});


/**
 * @swagger
 * tags:
 *   name: Investments
 *   description: Startup and business investment opportunities
 */

// Routes
router.use(protect); // All routes are protected

/**
 * @swagger
 * /api/investments:
 *   get:
 *     summary: Get all available investment opportunities
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [tech, food, ecommerce, service, other] }
 *     responses:
 *       200:
 *         description: List of investments
 */
/**
 * @swagger
 * /api/investments:
 *   post:
 *     summary: Create a new investment opportunity
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, investmentType, requiredAmount]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               category: { type: string, enum: [tech, food, ecommerce, service, other] }
 *               investmentType: { type: string, enum: [equity, loan, partnership] }
 *               requiredAmount: { type: number }
 *               equityOffered: { type: number }
 *               expectedReturn: { type: number }
 *               durationMonths: { type: number }
 *               stage: { type: string, enum: [idea, mvp, launched] }
 *     responses:
 *       201:
 *         description: Investment created
 */
router.route('/')
    .post(validate(investmentValidation), investmentController.createInvestment)
    .get(investmentController.getInvestments);

/**
 * @swagger
 * /api/investments/my:
 *   get:
 *     summary: Get investments created by the current user
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's investments
 */
router.get('/my', investmentController.getMyInvestments);

/**
 * @swagger
 * /api/investments/{id}:
 *   get:
 *     summary: Get investment by ID
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Investment data
 */
/**
 * @swagger
 * /api/investments/{id}:
 *   patch:
 *     summary: Update an investment opportunity
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Investment updated
 */
/**
 * @swagger
 * /api/investments/{id}:
 *   delete:
 *     summary: Delete an investment opportunity
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Investment deleted
 */
router.route('/:id')
    .get(investmentController.getInvestmentById)
    .patch(validate(investmentValidation), investmentController.updateInvestment)
    .delete(investmentController.deleteInvestment);

/**
 * @swagger
 * /api/investments/{id}/toggle-availability:
 *   patch:
 *     summary: Toggle investment availability status
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Availability toggled
 */
router.patch('/:id/toggle-availability', investmentController.toggleAvailability);

export default router;
