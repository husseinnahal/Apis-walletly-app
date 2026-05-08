import express from 'express';
import Joi from 'joi';
import * as savingsController from '../../controllers/savings.controller.js';
import { protect } from '../../middlewares/auth.js';
import validate, { createSchema } from '../../middlewares/validate.js';

const router = express.Router();

const savingGoalSchema = createSchema({
  body: {
    title: Joi.string().required().min(3).messages({
      'string.min': 'Title must be at least 3 characters',
      'any.required': 'Title is required',
    }),
    amount: Joi.number().required().min(0).messages({
      'number.min': 'Goal amount must be positive',
      'any.required': 'Goal amount is required',
    }),
    
    icon: Joi.string()
    .required()
    .pattern( /^\p{Emoji}+/u)
    .messages({
      'string.pattern.base': 'Icon must be a valid emoji',
      'any.required': 'Icon is required',
    }),
    note: Joi.string().optional().allow(''),
    
    deadline: Joi.date().optional().greater('now').messages({
      'date.greater': 'Deadline must be a future date',
    }),
    currency: Joi.string().required().messages({
      'any.required': 'Currency is required',
    }),  },
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
 *   name: Savings
 *   description: Financial saving goals and progress tracking
 */

// All routes are protected
router.use(protect);

/**
 * @swagger
 * /api/savings/stats:
 *   get:
 *     summary: Get monthly savings trends
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly savings stats
 */
router.get('/stats', savingsController.getSavingsMonthlyTrends);

/**
 * @swagger
 * /api/savings:
 *   get:
 *     summary: Get all saving goals
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of goals
 */
/**
 * @swagger
 * /api/savings:
 *   post:
 *     summary: Create a new saving goal
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, amount, icon, currency]
 *             properties:
 *               title: { type: string }
 *               amount: { type: number }
 *               icon: { type: string, example: "💰" }
 *               currency: { type: string }
 *               deadline: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Goal created
 */
router.route('/')
    .get(savingsController.getSavingGoals)
    .post(validate(savingGoalSchema), savingsController.createSavingGoal);

/**
 * @swagger
 * /api/savings/{id}:
 *   get:
 *     summary: Get saving goal by ID
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Goal data
 */
/**
 * @swagger
 * /api/savings/{id}:
 *   patch:
 *     summary: Update an existing saving goal
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Goal updated
 */
/**
 * @swagger
 * /api/savings/{id}:
 *   delete:
 *     summary: Delete a saving goal
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Goal deleted
 */
router.route('/:id')
    .get(savingsController.getSavingGoalById)
    .patch(validate(savingGoalSchema), savingsController.updateSavingGoal)
    .delete(savingsController.deleteSavingGoal);

/**
 * @swagger
 * /api/savings/{id}/insights:
 *   get:
 *     summary: Get AI insights for a saving goal
 *     tags: [Savings]
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
router.get('/:id/insights', savingsController.getGoalInsights);

/**
 * @swagger
 * /api/savings/{id}/progress:
 *   post:
 *     summary: Add progress to a saving goal
 *     tags: [Savings]
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
 *         description: Progress added
 */
router.route('/:id/progress')
    .post(validate(progressSchema), savingsController.addProgress);

/**
 * @swagger
 * /api/savings/{id}/progress/{progressId}:
 *   get:
 *     summary: Get a specific progress entry
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: progressId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Progress entry data
 */
/**
 * @swagger
 * /api/savings/{id}/progress/{progressId}:
 *   patch:
 *     summary: Update a progress entry
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: progressId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Progress updated
 */
/**
 * @swagger
 * /api/savings/{id}/progress/{progressId}:
 *   delete:
 *     summary: Delete a progress entry
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: progressId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Progress deleted
 */
router.route('/:id/progress/:progressId')
    .get(savingsController.getAPayment)
    .patch(validate(progressSchema), savingsController.updateProgress)
    .delete(savingsController.deleteProgress);

export default router;
