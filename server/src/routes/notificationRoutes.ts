import { Router } from 'express';
import {
  getNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../controllers/notificationController.js';
import { authMiddleware, requireActiveRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware, requireActiveRole);
router.get('/', listNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.get('/:id', getNotification);
router.patch('/:id/read', markNotificationRead);

export default router;
