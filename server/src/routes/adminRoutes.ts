import { Router } from 'express';
import {
  activateApprovalRule,
  activateRequestType,
  adminDashboard,
  createApprovalRule,
  createRole,
  createRequestType,
  deactivateApprovalRule,
  deactivateRequestType,
  deleteApprovalRule,
  deleteRole,
  listApprovalRules,
  listRoles,
  listRequestTypes,
  updateRole,
  updateApprovalRule,
  updateRequestType
} from '../controllers/adminController.js';
import { authMiddleware, requireActiveRole } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(authMiddleware, requireActiveRole, requireRoles(ROLES.ADMIN));
router.get('/dashboard', adminDashboard);
router.get('/roles', listRoles);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);
router.get('/approval-rules', listApprovalRules);
router.post('/approval-rules', createApprovalRule);
router.put('/approval-rules/:id', updateApprovalRule);
router.delete('/approval-rules/:id', deleteApprovalRule);
router.patch('/approval-rules/:id/activate', activateApprovalRule);
router.patch('/approval-rules/:id/deactivate', deactivateApprovalRule);
router.get('/request-types', listRequestTypes);
router.post('/request-types', createRequestType);
router.put('/request-types/:id', updateRequestType);
router.patch('/request-types/:id/activate', activateRequestType);
router.patch('/request-types/:id/deactivate', deactivateRequestType);

export default router;
