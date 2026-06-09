import { Router } from 'express';
import {
  activateUser,
  createUser,
  deactivateUser,
  getProfile,
  getUser,
  listUsers,
  resetPassword,
  updateProfile,
  updateRoles,
  updateUser
} from '../controllers/userController.js';
import { authMiddleware, requireActiveRole } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(authMiddleware, requireActiveRole);

router.get('/me/profile', getProfile);
router.put('/me/profile', updateProfile);

router.use(requireRoles(ROLES.ADMIN));
router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/activate', activateUser);
router.patch('/:id/deactivate', deactivateUser);
router.patch('/:id/roles', updateRoles);
router.patch('/:id/reset-password', resetPassword);

export default router;
