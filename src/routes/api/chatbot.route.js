import express from 'express';
import Joi from 'joi';
import * as chatbotController from '../../controllers/chatbot.controller.js';
import { protect } from '../../middlewares/auth.js';
import validate, { createSchema } from '../../middlewares/validate.js';

const router = express.Router();

const chatValidation = createSchema({
    body: {
        message: Joi.string().required().messages({
            'any.required': 'Message is required',
            'string.empty': 'Message cannot be empty'
        }),
        history: Joi.array().items(
            Joi.object({
                role: Joi.string().valid('user', 'assistant').required(),
                content: Joi.string().required()
            })
        ).optional(),
        language: Joi.string().optional()
    }
});

/**
 * @swagger
 * tags:
 *   name: Chatbot
 *   description: AI-powered financial assistant
 */

router.use(protect);

/**
 * @swagger
 * /api/chatbot:
 *   post:
 *     summary: Send a message to the AI assistant
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, example: "How much did I spend today?" }
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role: { type: string, enum: [user, assistant] }
 *                     content: { type: string }
 *               language: { type: string, example: "en" }
 *     responses:
 *       200:
 *         description: AI response
 */
router.post('/', validate(chatValidation), chatbotController.getResponse);

export default router;
