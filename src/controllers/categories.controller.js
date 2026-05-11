import * as categoriesService from '../services/categories.service.js';

export const getMyCategories = async (req, res) => {
    const categories = await categoriesService.getMyCategories(req.user._id, req.query.search);
    res.status(200).json({ 
        success: true,
        count: categories.length, 
        data: categories });
};

export const getMycustomCategories = async (req, res) => {
    const categories = await categoriesService.getMycustomCategories(req.user._id, req.query.search);
    res.status(200).json({ 
        success: true,
        count: categories.length, 
        data: categories });
};

export const createCustomCategory = async (req, res) => {
    const category = await categoriesService.createCustomCategory(req.user._id, req.body);
    res.status(201).json({
         success: true, 
         message: 'Custom category created',
         data: category });
};

export const updateCustomCategory = async (req, res) => {
    const category = await categoriesService.updateCustomCategory(req.user._id, req.params.categoryId, req.body);
    res.status(200).json({ 
        success: true, 
        message: 'Custom category updated',
        data: category 
    });
};

export const deleteCustomCategory = async (req, res) => {
    await categoriesService.deleteCustomCategory(req.user._id, req.params.categoryId);
    res.status(200).json({
         success: true,
         message: 'Custom category deleted' 
    });
};
