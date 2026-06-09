import { Router } from 'express';
import { forgotPassword, login, logout, me, requestAccount, selectRole } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/select-role', authMiddleware, selectRole);
router.get('/me', authMiddleware, me);
router.post('/logout', authMiddleware, logout);
router.post('/forgot-password', forgotPassword);
router.post('/request-account', requestAccount);

export default router;
