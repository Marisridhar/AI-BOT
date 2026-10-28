import { Router } from 'express';
import {
  startConversation,
  listConversations,
  getMessages,
  sendMessage
} from '../controllers/mentor.controller.js';
import authenticate from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.post('/conversations', startConversation);
router.get('/conversations', listConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);

export default router;

