import { Router } from 'express';
import { approvalHistory, approve, pendingApprovals, reject, requestInfo, verifyForward } from '../controllers/approvalController.js';
import { authMiddleware, requireActiveRole } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';
import { APPROVER_ROLES } from '../utils/constants.js';

const router = Router();

router.use(authMiddleware, requireActiveRole, requireRoles(...APPROVER_ROLES));
router.get('/pending', pendingApprovals);
router.get('/history', approvalHistory);
router.post('/:requestId/approve', approve);
router.post('/:requestId/verify-forward', verifyForward);
router.post('/:requestId/request-info', requestInfo);
router.post('/:requestId/reject', reject);

export default router;
