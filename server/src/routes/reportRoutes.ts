import { Router } from 'express';
import {
  claimsPerUserReport,
  exportExcel,
  exportPdf,
  monthlySummaryReport,
  paymentHistoryReport,
  pendingVsApproved,
  summary
} from '../controllers/reportController.js';
import { authMiddleware, requireActiveRole } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(authMiddleware, requireActiveRole, requireRoles(ROLES.ADMIN, ROLES.FINANCE_OFFICER, ROLES.FINANCE_DIVISION, ROLES.DEAN));
router.get('/summary', summary);
router.get('/claims-per-user', claimsPerUserReport);
router.get('/monthly-summary', monthlySummaryReport);
router.get('/pending-vs-approved', pendingVsApproved);
router.get('/payment-history', paymentHistoryReport);
router.get('/export/pdf', exportPdf);
router.get('/export/excel', exportExcel);

export default router;
