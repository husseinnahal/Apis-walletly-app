import express from 'express';
import { protect } from '../../middlewares/auth.js';
import {
    getConversations,
    getMessages,
    initiateChat,
    getContacts,
    deleteConversation,
} from '../../controllers/chat.controller.js';

const router = express.Router();

// Apply auth protection middleware to all chat routes
router.use(protect);

router.get('/', getConversations);
router.get('/contacts', getContacts);
router.post('/initiate', initiateChat);
router.get('/:conversationId/messages', getMessages);
router.delete('/:conversationId', deleteConversation);

export default router;
