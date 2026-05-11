import Category from '../models/categories.model.js';
import User from '../models/users.model.js';
import Transaction from '../models/transactions.model.js';
import ApiError from '../utils/ApiError.js';

// ==========================================
// ADMIN USER MANAGEMENT
// ==========================================

export const getAllAdmins = async (currentAdminId) => {
    return await User.find({ 
        role: 'admin',
        _id: { $ne: currentAdminId }
    }).select('-password');
};

export const createAdmin = async (adminData) => {
    const existing = await User.findOne({ 
        $or: [{ email: adminData.email }, { phone: adminData.phone }] 
    });
    
    if (existing) {
        throw ApiError.badRequest('Email or phone already in use');
    }

    // Force role to admin
    const newAdmin = await User.create({
        ...adminData,
        role: 'admin'
    });

    const adminWithoutPassword = newAdmin.toObject();
    delete adminWithoutPassword.password;
    return adminWithoutPassword;
};

export const deleteAdmin = async (adminIdToKill, requestingAdminId) => {
    if (adminIdToKill === requestingAdminId.toString()) {
        throw ApiError.badRequest('You cannot delete yourself!');
    }

    const admin = await User.findOneAndDelete({ _id: adminIdToKill, role: 'admin' });
    if (!admin) {
        throw ApiError.notFound('Admin not found');
    }
    return true;
};

// ==========================================
// GENERAL CATEGORY MANAGEMENT (Global Defaults)
// ==========================================

export const getGlobalCategories = async () => {
    // Return all categories that have isDefault strictly as true
    return await Category.find({ isDefault: true }).sort({ createdAt: -1 });
};

export const createGlobalCategory = async (categoryData) => {
        const existingCategory = await Category.findOne({
        name: categoryData.name,
        isDefault: true ,
    });

    if (existingCategory) {
        throw ApiError.badRequest('Already have a category with this name');
    }
    return await Category.create({
        ...categoryData,
        isDefault: true,
        user: null // Ensures it is definitely not tied to anyone
    });
};

export const updateGlobalCategory = async (categoryId, updateData) => {
   
    const existingCategory = await Category.findOne({
        name: updateData.name,
        isDefault: true,
        _id: { $ne: categoryId }

    });

    if (existingCategory) {
        throw ApiError.badRequest('You already have a category with this name');
    }

    const updated = await Category.findOneAndUpdate(
        { _id: categoryId, isDefault: true },
        updateData,
        { new: true, runValidators: true }
    );

    if (!updated) {
        throw ApiError.notFound('Global category not found');
    }
    return updated;
};

export const deleteGlobalCategory = async (categoryId) => {
    // 1. Check if the global category exists
    const category = await Category.findOne({ 
        _id: categoryId, 
        isDefault: true 
    });

    if (!category) {
        throw ApiError.notFound('Global category not found');
    }

    // 2. Check if there are any transactions associated with this category
    const transactionCount = await Transaction.countDocuments({ category: categoryId });
    
    if (transactionCount > 0) {
        throw ApiError.badRequest('Cannot delete global category because it has associated transactions.');
    }

    // 3. Delete the category
    await Category.findByIdAndDelete(categoryId);
    
    return true;
};
