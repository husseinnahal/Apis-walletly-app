import Notification from '../models/notification.model.js';
import User from '../models/users.model.js';
import { admin, initializeFirebase } from '../config/firebase.js';

// Initialize firebase on load
initializeFirebase();

/**
 * Create a new notification for a user
 * @param {string} userId 
 * @param {object} data - { title, description, icon, feature, metadata }
 */
export const createNotification = async (userId, data) => {
    try {
        const notification = await Notification.create({
            user: userId,
            ...data
        });

        // --- Firebase Push Notification ---
        try {
            if (admin.apps.length > 0) {
                const user = await User.findById(userId).select('fcmTokens');
                if (user && user.fcmTokens && user.fcmTokens.length > 0) {
                    const message = {
                        notification: {
                            title: data.title,
                            body: data.description,
                        },
                        data: {
                            feature: data.feature,
                            icon: data.icon || '🔔',
                            ...Object.fromEntries(
                                Object.entries(data.metadata || {}).map(([k, v]) => [k, String(v)])
                            )
                        },
                        tokens: user.fcmTokens,
                    };

                    const response = await admin.messaging().sendEachForMulticast(message);
                    
                    // Cleanup invalid tokens
                    if (response.failureCount > 0) {
                        const failedTokens = [];
                        response.responses.forEach((resp, idx) => {
                            if (!resp.success) {
                                const errorCode = resp.error?.code;
                                if (errorCode === 'messaging/invalid-registration-token' ||
                                    errorCode === 'messaging/registration-token-not-registered') {
                                    failedTokens.push(user.fcmTokens[idx]);
                                }
                            }
                        });
                        
                        if (failedTokens.length > 0) {
                            await User.findByIdAndUpdate(userId, {
                                $pull: { fcmTokens: { $in: failedTokens } }
                            });
                        }
                    }
                }
            }
        } catch (fcmError) {
            console.error('FCM Send Error:', fcmError.message);
        }
        // ----------------------------------

        return notification;
    } catch (error) {
        // We don't want to crash the main process if notification fails
        console.error('Notification creation failed:', error);
    }
};

/**
 * Create multiple notifications at once
 */
export const createManyNotifications = async (notifications) => {
    try {
        const result = await Notification.insertMany(notifications);

        // --- Firebase Push Notification (Bulk) ---
        try {
            if (admin.apps.length > 0) {
                // Get all unique user IDs
                const userIds = [...new Set(notifications.map(n => n.user.toString()))];
                const users = await User.find({ _id: { $in: userIds } }).select('fcmTokens');
                
                const userTokenMap = {};
                users.forEach(u => {
                    if (u.fcmTokens && u.fcmTokens.length > 0) {
                        userTokenMap[u._id.toString()] = u.fcmTokens;
                    }
                });

                for (const n of notifications) {
                    const tokens = userTokenMap[n.user.toString()];
                    if (tokens && tokens.length > 0) {
                        const message = {
                            notification: {
                                title: n.title,
                                body: n.description,
                            },
                            data: {
                                feature: n.feature,
                                icon: n.icon || '🔔',
                                ...Object.fromEntries(
                                    Object.entries(n.metadata || {}).map(([k, v]) => [k, String(v)])
                                )
                            },
                            tokens,
                        };
                        // We don't await each to avoid blocking too long, 
                        // but for small sets it's okay.
                        admin.messaging().sendEachForMulticast(message).catch(e => 
                            console.error(`FCM Multi Error for user ${n.user}:`, e.message)
                        );
                    }
                }
            }
        } catch (fcmError) {
            console.error('Bulk FCM Error:', fcmError.message);
        }
        // ------------------------------------------

        return result;
    } catch (error) {
        console.error('Bulk notification creation failed:', error);
    }
};

/**
 * Get all notifications for a user
 */
export const getMyNotifications = async (userId) => {
    return await Notification.find({ user: userId }).sort({ createdAt: -1 });
};

/**
 * Mark notification as read (Deletes it)
 */
export const markAsRead = async (userId, notificationId) => {
    return await Notification.findOneAndDelete({ _id: notificationId, user: userId });
};

/**
 * Mark all as read (Deletes all)
 */
export const markAllAsRead = async (userId) => {
    return await Notification.deleteMany({ user: userId });
};

