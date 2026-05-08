import * as adminService from '../services/admin.service.js';

// ==========================================
// ADMIN USER MANAGEMENT
// ==========================================

export const getAllAdmins = async (req, res) => {
    const admins = await adminService.getAllAdmins(req.user._id);
    res.status(200).json({ success: true, data: admins });
};

export const createAdmin = async (req, res) => {
    const newAdmin = await adminService.createAdmin(req.body);
    res.status(201).json({ success: true, message: 'Admin created successfully', data: newAdmin });
};

export const deleteAdmin = async (req, res) => {
    await adminService.deleteAdmin(req.params.adminId, req.user._id);
    res.status(200).json({ success: true, message: 'Admin deleted successfully' });
};

// ==========================================
// GENERAL CATEGORY MANAGEMENT
// ==========================================

export const getGlobalCategories = async (req, res) => {
    const categories = await adminService.getGlobalCategories();
    res.status(200).json({ success: true, data: categories });
};

export const createGlobalCategory = async (req, res) => {
    const category = await adminService.createGlobalCategory(req.body);
    res.status(201).json({ success: true, message: 'Global category created', data: category });
};

export const updateGlobalCategory = async (req, res) => {
    const category = await adminService.updateGlobalCategory(req.params.categoryId, req.body);
    res.status(200).json({ success: true, message: 'Global category updated', data: category });
};

export const deleteGlobalCategory = async (req, res) => {
    await adminService.deleteGlobalCategory(req.params.categoryId);
    res.status(200).json({ success: true, message: 'Global category deleted' });
};
