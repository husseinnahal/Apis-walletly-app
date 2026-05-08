import * as chatbotService from '../services/chatbot.service.js';

export const getResponse = async (req, res) => {
    const { message, history, language } = req.body;
    const userId = req.user._id;

    const response = await chatbotService.processChatQuery(userId, message, history || [], language || 'English');

    res.status(200).json({
        success: true,
        data: response
    });
};
