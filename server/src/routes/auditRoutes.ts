import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import { authMiddleware, requireActiveRole } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(authMiddleware, requireActiveRole, requireRoles(ROLES.ADMIN));
router.get('/', listAuditLogs);

export default router;
