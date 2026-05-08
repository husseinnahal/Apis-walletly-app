import express from 'express';
import Joi from 'joi';
import * as categoriesController from '../../controllers/categories.controller.js';
import validate, { createSchema } from '../../middlewares/validate.js';
import { protect } from '../../middlewares/auth.js';

const router = express.Router();

const customCategorySchema = createSchema({
  body: {
    name: Joi.string().required().min(3).max(15).messages({
      'string.min': 'Category name must be at least 3 characters',
      'string.max': 'Category name cannot exceed 15 characters',
    }),
  icon: Joi.string()
    .required()
    .pattern( /^\p{Emoji}+/u)
    .messages({
      'string.pattern.base': 'Icon must be a valid emoji',
      'any.required': 'Category icon is required',
    }),
  },
});

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Expense and income categories management
 */

// ALL generic category routes require a logged-in user
router.use(protect);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all available categories (default + custom)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/', categoriesController.getMyCategories);

/**
 * @swagger
 * /api/categories/custom:
 *   get:
 *     summary: Get only user's custom categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of custom categories
 */
router.get('/custom', categoriesController.getMycustomCategories);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new custom category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, icon]
 *             properties:
 *               name: { type: string, example: "Gaming" }
 *               icon: { type: string, example: "🎮" }
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/', validate(customCategorySchema), categoriesController.createCustomCategory);

/**
 * @swagger
 * /api/categories/{categoryId}:
 *   put:
 *     summary: Update a custom category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put('/:categoryId', validate(customCategorySchema), categoriesController.updateCustomCategory);

/**
 * @swagger
 * /api/categories/{categoryId}:
 *   delete:
 *     summary: Delete a custom category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Category deleted
 */
router.delete('/:categoryId', categoriesController.deleteCustomCategory);

export default router;
