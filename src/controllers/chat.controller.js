import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import User from '../models/users.model.js';
import ApiError from '../utils/ApiError.js';

/**
 * Get all conversations for the logged-in user
 */
export const getConversations = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.find({
            participants: userId,
            deletedBy: { $ne: userId }
        })
            .populate('participants', 'username email avatar lastSeen')
            .populate({
                path: 'lastMessage',
                populate: {
                    path: 'sender',
                    select: 'username avatar',
                },
            })
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            conversations,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get messages inside a conversation (requires participant status)
 */
export const getMessages = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        // Verify conversation exists and user is a participant
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            throw ApiError.forbidden('Access denied: You are not a participant in this conversation.');
        }

        // Mark messages sent by others as read
        await Message.updateMany(
            { conversationId, sender: { $ne: userId }, isRead: false },
            { $set: { isRead: true } }
        );

        const messages = await Message.find({ conversationId })
            .populate('sender', 'username email avatar')
            .sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            messages,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Initiate/Create a conversation with another user
 */
export const initiateChat = async (req, res, next) => {
    try {
        const { recipientId } = req.body;
        const senderId = req.user._id;

        if (!recipientId) {
            throw ApiError.badRequest('Recipient user ID is required.');
        }

        if (senderId.toString() === recipientId.toString()) {
            throw ApiError.badRequest('You cannot initiate a conversation with yourself.');
        }

        // Verify recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            throw ApiError.notFound('Recipient user not found.');
        }

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId] },
        });

        if (!conversation) {
            // Create new conversation
            conversation = await Conversation.create({
                participants: [senderId, recipientId],
            });
        } else {
            // If the conversation exists but was previously soft-deleted, restore it
            if (conversation.deletedBy && conversation.deletedBy.includes(senderId)) {
                conversation.deletedBy = conversation.deletedBy.filter(
                    (id) => id.toString() !== senderId.toString()
                );
                await conversation.save();
            }
        }

        // Populate details
        const populatedConversation = await Conversation.findById(conversation._id)
            .populate('participants', 'username email avatar lastSeen')
            .populate('lastMessage');

        res.status(200).json({
            success: true,
            conversation: populatedConversation,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * List all users (contacts) excluding the logged-in user, with search capability
 */
export const getContacts = async (req, res, next) => {
    try {
        const currentUserId = req.user._id;
        const { search } = req.query;

        let query = { _id: { $ne: currentUserId } };

        if (search) {
            query.username = { $regex: search, $options: 'i' };
        }

        const contacts = await User.find(query).select('username email avatar phone lastSeen').sort({ username: 1 });

        res.status(200).json({
            success: true,
            contacts,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Soft delete a conversation thread for the logged-in user
 */
export const deleteConversation = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findOneAndUpdate(
            { _id: conversationId, participants: userId },
            { $addToSet: { deletedBy: userId } },
            { new: true }
        );

        if (!conversation) {
            throw ApiError.notFound('Conversation not found or access denied.');
        }

        res.status(200).json({
            success: true,
            message: 'Conversation deleted successfully from your list.'
        });
    } catch (error) {
        next(error);
    }
};
