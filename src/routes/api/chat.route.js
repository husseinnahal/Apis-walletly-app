import express from 'express';
import { protect } from '../../middlewares/auth.js';
import {
    getConversations,
    getMessages,
    initiateChat,
    getContacts,
    deleteConversation,
} from '../../controllers/chat.controller.js';

const router = express.Router();

// Apply auth protection middleware to all chat routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Chats
 *   description: Real-time user-to-user chat conversations and messages
 */

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Get conversations list for the current user
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active conversations list
 */
router.get('/', getConversations);

/**
 * @swagger
 * /api/chats/contacts:
 *   get:
 *     summary: Get lists of available contacts to chat with
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User contacts list
 */
router.get('/contacts', getContacts);

/**
 * @swagger
 * /api/chats/initiate:
 *   post:
 *     summary: Start or retrieve an existing chat room with a user
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversation details
 */
router.post('/initiate', initiateChat);

/**
 * @swagger
 * /api/chats/{conversationId}/messages:
 *   get:
 *     summary: Get message history for a conversation
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages list
 */
router.get('/:conversationId/messages', getMessages);

/**
 * @swagger
 * /api/chats/{conversationId}:
 *   delete:
 *     summary: Soft delete a chat room from the user's list
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success confirmation message
 */
router.delete('/:conversationId', deleteConversation);

export default router;
