import { Router } from 'express';
import { register, login, logout, getMe, acceptInvitation } from '../controllers/auth.controller.js';
import authenticate from '../middleware/authenticate.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/accept-invitation', acceptInvitation);
router.get('/me', authenticate, getMe);

export default router;

