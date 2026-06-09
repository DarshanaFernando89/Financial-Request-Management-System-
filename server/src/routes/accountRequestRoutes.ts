import { Router } from 'express';
import {
  approveAccountRequest,
  createAccountRequest,
  getAccountRequest,
  listAccountRequests,
  rejectAccountRequest
} from '../controllers/accountRequestController.js';
import { authMiddleware, requireActiveRole } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.post('/', createAccountRequest);
router.use(authMiddleware, requireActiveRole, requireRoles(ROLES.ADMIN));
router.get('/', listAccountRequests);
router.get('/:id', getAccountRequest);
router.patch('/:id/approve', approveAccountRequest);
router.patch('/:id/reject', rejectAccountRequest);

export default router;
