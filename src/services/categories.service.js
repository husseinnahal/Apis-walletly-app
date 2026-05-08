import Category from '../models/categories.model.js';
import ApiError from '../utils/ApiError.js';

export const getMyCategories = async (userId) => {
    // Return all global defaults OR my custom categories
    return await Category.find({
        $or: [
            { isDefault: true },
            { user: userId }
        ]
    }).sort({ createdAt: -1 });
};

export const getMycustomCategories = async (userId) => {
    // Return all  my custom categories
    return await Category.find({
            isDefault: false,
            user: userId 
    }).sort({ createdAt: -1 });
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
    // Only allow deleting if the user actually owns it
    const deleted = await Category.findOneAndDelete({ 
        _id: categoryId, 
        user: userId, 
        isDefault: false 
    });

    if (!deleted) {
        throw ApiError.notFound('this category not found.');
    }
    
    return true;
};
