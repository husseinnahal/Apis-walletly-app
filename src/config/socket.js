import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from './index.js';
import User from '../models/users.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import logger from '../utils/logger.js';
import { createNotification } from '../services/notification.service.js';

let io = null;
const onlineUsers = new Map(); // key: userId, value: socketId

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    // Authentication middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
            if (token && token.startsWith('Bearer ')) {
                token = token.slice(7);
            }

            if (!token) {
                return next(new Error('Authentication error: Token missing'));
            }

            const decoded = jwt.verify(token, config.jwt.accessSecret);
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            logger.error('Socket authentication failed:', error.message);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user._id.toString();
        logger.info(`User connected to socket: ${socket.user.username} (${socket.id})`);

        // Track online status
        onlineUsers.set(userId, socket.id);
        
        // Broadcast that user is online
        io.emit('user_status_change', {
            userId,
            isOnline: true
        });

        // Join a unique room for the conversation
        socket.on('join_room', (conversationId) => {
            socket.join(conversationId);
            logger.info(`Socket ${socket.id} (user: ${socket.user.username}) joined room: ${conversationId}`);
        });

        // Leave a unique room
        socket.on('leave_room', (conversationId) => {
            socket.leave(conversationId);
            logger.info(`Socket ${socket.id} (user: ${socket.user.username}) left room: ${conversationId}`);
        });

        // Handle sending messages in real-time
        socket.on('send_message', async (data) => {
            const { conversationId, text } = data;
            if (!conversationId || !text) return;

            try {
                // Check if recipient is also currently in the socket room
                const clientsInRoom = io.sockets.adapter.rooms.get(conversationId);
                const isRead = clientsInRoom && clientsInRoom.size > 1;

                // Save to database
                const newMessage = await Message.create({
                    conversationId,
                    sender: socket.user._id,
                    text,
                    isRead,
                });

                // Update the conversation's lastMessage reference and clear deletedBy soft-deletes
                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: newMessage._id,
                    $set: { deletedBy: [] } // Show conversation again to participants if a new message comes
                });

                // Populate sender information
                const populatedMessage = await Message.findById(newMessage._id)
                    .populate('sender', 'username email avatar')
                    .exec();

                // Broadcast message to everyone in the room
                io.to(conversationId).emit('message_received', populatedMessage);
                
                // Also trigger a general notification update event for participants offline or in other rooms
                const conv = await Conversation.findById(conversationId);
                if (conv) {
                    const recipientId = conv.participants.find(
                        (pId) => pId.toString() !== socket.user._id.toString()
                    );

                    // Check if the recipient is currently inside this socket room
                    const isRecipientInRoom = clientsInRoom && Array.from(clientsInRoom).some(
                        (socketId) => {
                            const clientSocket = io.sockets.sockets.get(socketId);
                            return clientSocket && clientSocket.user && clientSocket.user._id.toString() === recipientId?.toString();
                        }
                    );

                    // Send push notification + DB record if not in room
                    if (recipientId && !isRecipientInRoom) {
                        try {
                            await createNotification(recipientId, {
                                title: `New message from ${socket.user.username}`,
                                description: text.length > 50 ? `${text.substring(0, 47)}...` : text,
                                icon: '💬',
                                feature: 'chat',
                                metadata: { 
                                    conversationId, 
                                    senderId: socket.user._id.toString(),
                                    senderName: socket.user.username
                                }
                            });
                        } catch (notifErr) {
                            logger.error('Failed to trigger chat push notification:', notifErr.message);
                        }
                    }

                    conv.participants.forEach(participantId => {
                        if (participantId.toString() !== socket.user._id.toString()) {
                            io.to(participantId.toString()).emit('new_message_notification', {
                                conversationId,
                                message: populatedMessage
                            });
                        }
                    });
                }

            } catch (err) {
                logger.error('Error saving/sending socket message:', err.message);
            }
        });

        // Typing indicators
        socket.on('typing', (data) => {
            const { conversationId, isTyping } = data;
            socket.to(conversationId).emit('user_typing', {
                userId: socket.user._id,
                username: socket.user.username,
                isTyping
            });
        });

        // Client check status for a specific user
        socket.on('check_status', async (targetUserId) => {
            const isOnline = onlineUsers.has(targetUserId);
            let lastSeen = new Date();
            if (!isOnline) {
                const usr = await User.findById(targetUserId);
                if (usr) lastSeen = usr.lastSeen;
            }
            socket.emit('status_response', {
                userId: targetUserId,
                isOnline,
                lastSeen
            });
        });

        // Personal user room for offline notification triggers
        socket.join(userId);

        socket.on('disconnect', async () => {
            logger.info(`User disconnected: ${socket.user.username} (${socket.id})`);
            onlineUsers.delete(userId);
            
            // Save lastSeen timestamp to DB on disconnect
            const lastSeenDate = new Date();
            try {
                await User.findByIdAndUpdate(userId, { lastSeen: lastSeenDate });
            } catch (err) {
                logger.error('Failed to update lastSeen timestamp:', err.message);
            }

            // Broadcast offline status
            io.emit('user_status_change', {
                userId,
                isOnline: false,
                lastSeen: lastSeenDate
            });
        });
    });

    return io;
};

export const getSocketIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
