import express from 'express';
import * as notificationController from '../../controllers/notification.controller.js';
import { protect } from '../../middlewares/auth.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notifications and alerts
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', notificationController.getMyNotifications);

/**
 * @swagger
 * /api/notifications/register-fcm-token:
 *   post:
 *     summary: Register an FCM token for push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token registered successfully
 */
router.post('/register-fcm-token', notificationController.registerFCMToken);



/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   delete:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success message
 */
router.delete('/mark-all-read', notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   delete:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated notification
 */
router.delete('/:notificationId/read', notificationController.markAsRead);



export default router;
