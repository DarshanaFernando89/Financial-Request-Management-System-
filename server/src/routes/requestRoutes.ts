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
import { authMiddleware, requireActiveRole } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware, requireActiveRole);
router.get(
  '/types/active',
  asyncHandler(async (_req, res) => {
    const items = await RequestTypeModel.find({ isActive: true }).sort({ name: 1 });
    res.json({ items });
  })
);
router.get('/my', listMyRequests);
router.get('/', listRequests);
router.post('/', createRequest);
router.get('/:id', getRequest);
router.put('/:id', updateRequest);
router.post('/:id/submit', submitRequest);
router.post('/:id/resubmit', resubmitRequest);
router.post('/:id/upload-document', upload.single('file'), uploadDocument);
router.post('/:id/respond-clarification', upload.single('file'), respondClarification);
router.get('/:id/summary', downloadRequestSummary);
router.delete('/:id/cancel-draft', cancelDraft);

export default router;
