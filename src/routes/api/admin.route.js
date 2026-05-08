import express from 'express';
import Joi from 'joi';
import * as adminController from '../../controllers/admin.controller.js';
import validate, { createSchema } from '../../middlewares/validate.js';
import { protect, authorizeAdmin } from '../../middlewares/auth.js';

const router = express.Router();

const adminUserSchema = createSchema({
  body: {
    username: Joi.string().required().min(3).max(50),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    password: Joi.string().required().min(8),
  },
});

const globalCategorySchema = createSchema({
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
 *   name: Admin
 *   description: Administrative operations and global settings
 */

// ALL routes inside this file are protected and strictly for Admins
router.use(protect);
router.use(authorizeAdmin);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all administrative users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admins
 */
router.get('/users', adminController.getAllAdmins);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new admin account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, phone, password]
 *             properties:
 *               username: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: Admin created
 */
router.post('/users', validate(adminUserSchema), adminController.createAdmin);

/**
 * @swagger
 * /api/admin/users/{adminId}:
 *   delete:
 *     summary: Delete an admin account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Admin deleted
 */
router.delete('/users/:adminId', adminController.deleteAdmin);

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all global (system-wide) categories
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of global categories
 */
router.get('/categories', adminController.getGlobalCategories);

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create a new global category
 *     tags: [Admin]
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
 *               name: { type: string }
 *               icon: { type: string }
 *     responses:
 *       201:
 *         description: Global category created
 */
router.post('/categories', validate(globalCategorySchema), adminController.createGlobalCategory);

/**
 * @swagger
 * /api/admin/categories/{categoryId}:
 *   put:
 *     summary: Update a global category
 *     tags: [Admin]
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
router.put('/categories/:categoryId', validate(globalCategorySchema), adminController.updateGlobalCategory);

/**
 * @swagger
 * /api/admin/categories/{categoryId}:
 *   delete:
 *     summary: Delete a global category
 *     tags: [Admin]
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
router.delete('/categories/:categoryId', adminController.deleteGlobalCategory);

export default router;
