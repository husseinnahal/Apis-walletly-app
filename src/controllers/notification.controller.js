import * as notificationService from '../services/notification.service.js';
import User from '../models/users.model.js';

export const getMyNotifications = async (req, res) => {
    const notifications = await notificationService.getMyNotifications(req.user._id);
    res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications
    });
};

export const markAsRead = async (req, res) => {
     await notificationService.markAsRead(req.user._id, req.params.notificationId);
    res.status(200).json({
        success: true,
        message: ' Mark a single notification as read'
    });
};

export const markAllAsRead = async (req, res) => {
    await notificationService.markAllAsRead(req.user._id);
    res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
    });
};

export const registerFCMToken = async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const user = await User.findById(req.user._id);
    if (user && !user.fcmTokens.includes(token)) {
        user.fcmTokens.push(token);
        await user.save();
    }

    res.status(200).json({
        success: true,
        message: 'FCM token registered successfully'
    });
};

