import Category from '../models/categories.model.js';
import Transaction from '../models/transactions.model.js';
import ApiError from '../utils/ApiError.js';

export const getMyCategories = async (userId, search = '') => {
    const query = {
        $or: [
            { isDefault: true },
            { user: userId }
        ]
    };

    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }

    // Return all global defaults OR my custom categories
    return await Category.find(query).sort({ createdAt: -1 });
};

export const getMycustomCategories = async (userId, search = '') => {
    const query = {
        isDefault: false,
        user: userId 
    };

    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }

    // Return all  my custom categories
    return await Category.find(query).sort({ createdAt: -1 });
};

export const createCustomCategory = async (userId, categoryData) => {
    // Check if user already has a category with the same name
    const existingCategory = await Category.findOne({
        name: categoryData.name,
        $or: [
            { isDefault: true },
            { user: userId }
        ]
    });

    if (existingCategory) {
        throw ApiError.badRequest('You already have a category with this name');
    }

    // Enforce custom category logic
    return await Category.create({
        ...categoryData,
        isDefault: false,
        user: userId
    });
};

export const updateCustomCategory = async (userId, categoryId, updateData) => {
    
    const existingCategory = await Category.findOne({
        name: updateData.name,
        $or: [
            { isDefault: true },
            { user: userId }
        ],
        _id: { $ne: categoryId }
    });

    if (existingCategory) {
        throw ApiError.badRequest('You already have a category with this name');
    }

    // Only allow updating if the user actually owns it
    const updated = await Category.findOneAndUpdate(
        { _id: categoryId, user: userId, isDefault: false },
        updateData,
        { new: true, runValidators: true }
    );

    if (!updated) {
        throw ApiError.notFound('Custom category not found .');
    }
    
    return updated;
};

export const deleteCustomCategory = async (userId, categoryId) => {
    // 1. Check if the category exists and belongs to the user
    const category = await Category.findOne({ 
        _id: categoryId, 
        user: userId, 
        isDefault: false 
    });

    if (!category) {
        throw ApiError.notFound('Custom category not found.');
    }

    // 2. Check if there are any transactions associated with this category
    const transactionCount = await Transaction.countDocuments({ category: categoryId });
    
    if (transactionCount > 0) {
        throw ApiError.badRequest('Cannot delete category because it has associated transactions.');
    }

    // 3. Delete the category
    await Category.findByIdAndDelete(categoryId);
    
    return true;
};
