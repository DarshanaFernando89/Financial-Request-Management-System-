import { Router } from 'express';
import {
  cancelDraft,
  createRequest,
  downloadRequestSummary,
  getRequest,
  listMyRequests,
  listRequests,
  respondClarification,
  resubmitRequest,
  submitRequest,
  updateRequest,
  uploadDocument
} from '../controllers/requestController.js';
import { RequestTypeModel } from '../models/RequestType.js';
import { ApprovalRuleModel } from '../models/ApprovalRule.js';
import { authMiddleware, requireActiveRole } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware, requireActiveRole);
router.get(
  '/rules/active',
  asyncHandler(async (_req, res) => {
    const rules = await ApprovalRuleModel.find({ isActive: true })
      .select('name requestTypes minAmount maxAmount')
      .populate({ path: 'requestTypes', match: { isActive: true } })
      .sort({ priority: 1, minAmount: 1 });
    res.json({ items: rules.filter((rule) => rule.requestTypes.length > 0) });
  })
);
router.get(
  '/types/active',
  asyncHandler(async (_req, res) => {
    const items = await RequestTypeModel.find({ isActive: true }).sort({ name: 1 });
    res.json({ items });
  })
);
router.get('/my', listMyRequests);
router.get('/', listRequests);
router.post('/', upload.array('files', 20), createRequest);
router.get('/:id', getRequest);
router.put('/:id', updateRequest);
router.post('/:id/submit', submitRequest);
router.post('/:id/resubmit', resubmitRequest);
router.post('/:id/upload-document', upload.single('file'), uploadDocument);
router.post('/:id/respond-clarification', upload.array('files', 20), respondClarification);
router.get('/:id/summary', downloadRequestSummary);
router.delete('/:id/cancel-draft', cancelDraft);

export default router;
