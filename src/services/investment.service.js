import Investment from '../models/investment.model.js';
import User from '../models/users.model.js';
import * as notificationService from './notification.service.js';
import ApiError from '../utils/ApiError.js';

/*
 * Create a new investment opportunity
 */
export const createInvestment = async (userId, investmentData) => {
    const investment = await Investment.create({
        ...investmentData,
        userId
    });

    // Send notification to all users
    (async () => {
        try {
            const users = await User.find({ _id: { $ne: userId } }, '_id'); // Notify everyone except the creator
            const notifications = users.map(user => ({
                user: user._id,
                title: 'New Investment Opportunity',
                description: `A new investment "${investment.title}" has been posted.`,
                icon: '📈',
                feature: 'investment',
                metadata: { investmentId: investment._id }
            }));
            
            if (notifications.length > 0) {
                await notificationService.createManyNotifications(notifications);
            }
        } catch (error) {
            console.error('[Notification] Failed to send bulk investment notifications:', error.message);
        }
    })();

    return investment;
};

/**
 * Get investments for the marketplace (excluding user's own)
 */
export const getInvestments = async (userId, filters = {}) => {
    const query = {};

    if (filters.isAvailable !== undefined) {
        query.isAvailable = filters.isAvailable === 'true' || filters.isAvailable === true;
    }
    
    if (filters.minPrice) query.minInvestment = { ...query.minInvestment, $gte: Number(filters.minPrice) };
    if (filters.maxPrice) query.minInvestment = { ...query.minInvestment, $lte: Number(filters.maxPrice) };

    if (filters.category) query.category = filters.category;
    if (filters.stage) query.stage = filters.stage;
    if (filters.investmentType) query.investmentType = filters.investmentType;
    if (filters.search) {
        query.$or = [
            { title: { $regex: filters.search, $options: 'i' } },
            { description: { $regex: filters.search, $options: 'i' } }
        ];
    }

    const [investments, availableCount] = await Promise.all([
        Investment.find(query)
            .populate('userId', ' username email phone avatar')
            .sort({ isAvailable: -1, createdAt: -1 }),
        Investment.countDocuments({ isAvailable: true })
    ]);
        
    return {
        investments,
        availableCount
    };
};

/**
 * Get investments posted by the current user
 */
export const getMyInvestments = async (userId) => {
    const investments = await Investment.find({ userId }).sort({ createdAt: -1 });
    return investments;
};

/**
 * Get details of a specific investment
 */
export const getInvestmentById = async (userId, investmentId) => {
    const investment = await Investment.findById(investmentId).populate('userId', 'username email phone avatar');
    
    if (!investment) {
        throw ApiError.notFound('Investment opportunity not found');
    }

    // Increment views if the viewer is not the owner
    if (investment.userId._id.toString() !== userId.toString()) {
        investment.views += 1;
        await investment.save();
    }

    return investment;
};

/**
 * Update an investment opportunity
 */
export const updateInvestment = async (userId, investmentId, updateData) => {
    const investment = await Investment.findOne({ _id: investmentId, userId });
    
    if (!investment) {
        throw ApiError.notFound('Investment opportunity not found or you are not the owner');
    }

    Object.assign(investment, updateData);
    await investment.save();
    
    return investment;
};

/**
 * Toggle investment availability
 */
export const toggleAvailability = async (userId, investmentId) => {
    const investment = await Investment.findOne({ _id: investmentId, userId });
    
    if (!investment) {
        throw ApiError.notFound('Investment opportunity not found ');
    }

    investment.isAvailable = !investment.isAvailable;
    await investment.save();
    
    return investment;
};

/**
 * Delete an investment opportunity
 */
export const deleteInvestment = async (userId, investmentId) => {
    const investment = await Investment.findOneAndDelete({ _id: investmentId, userId });
    
    if (!investment) {
        throw ApiError.notFound('Investment opportunity not found or you are not the owner');
    }

    return investment;
};
