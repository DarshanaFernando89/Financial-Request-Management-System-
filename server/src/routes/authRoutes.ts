import { Router } from 'express';
import { forgotPassword, login, logout, me, requestAccount } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/select-role', (_req, res) => {
  res.status(410).json({ message: 'Role switching has been removed. Sign in with the separate account for that role.' });
});
router.get('/me', authMiddleware, me);
router.post('/logout', authMiddleware, logout);
router.post('/forgot-password', forgotPassword);
router.post('/request-account', requestAccount);

export default router;
