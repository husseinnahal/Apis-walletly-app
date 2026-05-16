import express from 'express';
import Joi from 'joi';
import * as usersController from '../../../controllers/users.controller.js';
import validate, { createSchema } from '../../../middlewares/validate.js';
import { protect } from '../../../middlewares/auth.js';
import { upload } from '../../../middlewares/upload.js';

const router = express.Router();

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>,.?/:;{}[\]~]).{8,}$/;
const phoneRegex = /^\+[1-9]\d{1,14}$/;

const updateInfoSchema = createSchema({
     body: {
          username: Joi.string().required().min(3).max(50).messages({

               'any.required': 'Username is required',
               'string.min': 'Username must be at least 3 characters',
          }),
          email: Joi.string().email().required().messages({
               'any.required': 'Email is required',
               'string.email': 'Please provide a valid email address',
          }),
          phone: Joi.string().pattern(phoneRegex).required().messages({
               'any.required': 'Phone number is required',
               'string.pattern.base': 'Phone number must include country code (e.g., +1234567890)',
          }),
     },
});

const updatePasswordSchema = createSchema({
     body: {
          currentPassword: Joi.string().required().messages({
               
               'any.required': 'Please provide your current password',
          }),
          newPassword: Joi.string().pattern(passwordRegex).required().messages({
               'string.pattern.base': 'New password must be at least 8 characters and contain at least 1 uppercase letter, 1 number, and 1 special character',
               'any.required': 'Please provide your new password',
          }),
     },
});

const updateCurrencySchema = createSchema({
     body: {
          currency: Joi.string().length(3).uppercase().required().messages({
               'string.length': 'Currency must be exactly 3 letters (e.g., USD, EGP)',
               'any.required': 'Currency is required',
          }),
          currencyRate: Joi.number().positive().optional().messages({
               'number.base': 'Currency rate must be a number',
               'number.positive': 'Currency rate must be positive',
          })
     },
});

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and settings management
 */

// Note: all routes are under /api/users/profile/...
// Protect all routes below
router.use(protect);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', usersController.getMe);
router.get('/allusers', usersController.getUsers);
router.get('/upcoming', usersController.getUpcoming);

/**
 * @swagger
 * /api/users/profile/info:
 *   put:
 *     summary: Update user basic info
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/profile/info', validate(updateInfoSchema), usersController.updateInfo);

/**
 * @swagger
 * /api/users/profile/password:
 *   put:
 *     summary: Update user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.put('/profile/password', validate(updatePasswordSchema), usersController.updatePassword);

/**
 * @swagger
 * /api/users/profile/avatar:
 *   put:
 *     summary: Update user avatar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar updated
 */
router.put('/profile/avatar', upload.single('avatar'), usersController.updateAvatar);

/**
 * @swagger
 * /api/users/profile/currency:
 *   put:
 *     summary: Update user base currency
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currency
 *             properties:
 *               currency:
 *                 type: string
 *                 example: EGP
 *               currencyRate:
 *                 type: number
 *                 example: 48.25
 *     responses:
 *       200:
 *         description: Currency updated
 */
router.put('/profile/currency', validate(updateCurrencySchema), usersController.updateCurrency);

export default router;
