import express from 'express';
import Joi from 'joi';
import * as authController from '../../../controllers/auth.controller.js';
import validate, { createSchema } from '../../../middlewares/validate.js';
import { protect } from '../../../middlewares/auth.js';

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration, login, and session management
 */

const router = express.Router();

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>,.?/:;{}[\]~]).{8,}$/;
const phoneRegex = /^\+[1-9]\d{1,14}$/; // Standard E.164 format (+ and up to 15 digits)

const registerSchema = createSchema({
     body: {
          username: Joi.string().required().min(3).max(50).messages({
               'any.required': 'Usernamee is required',
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
          password: Joi.string().pattern(passwordRegex).required().messages({
               'any.required': 'Password is required',
               'string.pattern.base': 'Password must be at least 8 characters and contain at least 1 uppercase letter, 1 number, and 1 special character',
          }),
     },
});

const loginSchema = createSchema({
     body: {
          identifier: Joi.string().required().messages({
               'any.required': 'Please provide an email or phone number to login',
          }),
          password: Joi.string().required().messages({
               'any.required': 'Please provide your password',
          }),
     },
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "StrongPass123!"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or phone number
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "StrongPass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', authController.logout); 

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: Get all active sessions
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sessions
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', protect, authController.getSessions);

/**
 * @swagger
 * /api/auth/sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked
 *       401:
 *         description: Unauthorized
 */
router.delete('/sessions/:sessionId', protect, authController.revokeSession);

export default router;

