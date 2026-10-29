import { Router } from 'express';
import {
  exportPaymentReceipt,
  financeReject,
  financeRequestDetails,
  financeRequestInfo,
  markPaid,
  paymentHistory,
  pendingPayments
} from '../controllers/financeController.js';
import { authMiddleware, requireActiveRole } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(authMiddleware, requireActiveRole);
router.get(
  '/:requestId/payment-receipt',
  requireRoles(ROLES.FINANCE_OFFICER, ROLES.HOD, ROLES.DEAN),
  exportPaymentReceipt
);
router.use(requireRoles(ROLES.FINANCE_OFFICER));
router.get('/pending-payments', pendingPayments);
router.get('/payment-history', paymentHistory);
router.get('/:requestId', financeRequestDetails);
router.post('/:requestId/mark-paid', markPaid);
router.post('/:requestId/request-info', financeRequestInfo);
router.post('/:requestId/reject', financeReject);

export default router;
