import * as metalService from '../services/metals.service.js';

export const addMetal = async (req, res) => {
    const metal = await metalService.addMetal(req.user._id, req.body);
    res.status(201).json({
        success: true,
        data: metal
    });
};

export const getMetals = async (req, res) => {
    const { type, form } = req.query;
    const metals = await metalService.getMetals(req.user._id, { type, form });
    
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        count: metals.length,
        data: metals
    });
};

export const getMetalStats = async (req, res) => {
    const stats = await metalService.getMetalStats(req.user._id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: stats
    });
};

export const getMetalById = async (req, res) => {
    const metal = await metalService.getMetalById(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        currency: req.user.currency,
        currencyRate: req.user.currencyRate,
        data: metal
    });
};

export const updateMetal = async (req, res) => {
    const metal = await metalService.updateMetal(req.user._id, req.params.id, req.body);
    res.status(200).json({
        success: true,
        data: metal
    });
};

export const deleteMetal = async (req, res) => {
    await metalService.deleteMetal(req.user._id, req.params.id);
    res.status(200).json({
        success: true,
        data: {}
    });
};
