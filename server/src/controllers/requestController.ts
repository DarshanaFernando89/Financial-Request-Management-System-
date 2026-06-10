import { RequestModel } from '../models/Request.js';
import { RequestTypeModel } from '../models/RequestType.js';
import { APPROVAL_ACTIONS, REQUEST_STATUSES } from '../utils/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { canAdmin, isPrivilegedReader } from '../utils/permissions.js';
import { createRequestForUser } from '../services/requestService.js';
import {
  getRequestByIdOrRequestId,
  initializeWorkflow,
  restartWorkflowForResubmission,
  returnFromClarification
} from '../services/workflowService.js';
import { notifyRole, notifyUser } from '../services/notificationService.js';
import { writeAuditLog } from '../services/auditService.js';

function requestFilterFromQuery(query: any) {
  const filter: any = {};
  if (query.status) filter.status = query.status;
  if (query.requestType) filter.requestType = query.requestType;
  if (query.search) {
    const search = new RegExp(String(query.search), 'i');
    filter.$or = [{ requestId: search }, { title: search }, { 'requesterSnapshot.name': search }];
  }
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }
  return filter;
}

function attachUploadedFile(req: any, request: any, description?: string) {
  if (!req.file) return;
  request.documents.push({
    filename: req.file.filename,
    originalName: req.file.originalname,
    fileUrl: `/uploads/${req.file.filename}`,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user.userId,
    uploadedByRole: req.user.activeRole,
    uploadedAt: new Date(),
    description
  });
}

function normalizeUploadedFiles(req: any) {
  if (Array.isArray(req.files)) return req.files;
  return req.file ? [req.file] : [];
}

function normalizeBodyList(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (value === undefined || value === null) return [];
  return [String(value)];
}

function uploadedDocuments(req: any) {
  const descriptions = normalizeBodyList(req.body.documentDescriptions);
  return normalizeUploadedFiles(req).map((file: any, index: number) => ({
    filename: file.filename,
    originalName: file.originalname,
    fileUrl: `/uploads/${file.filename}`,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy: req.user.userId,
    uploadedByRole: req.user.activeRole,
    uploadedAt: new Date(),
    description: descriptions[index]
  }));
}

function parseRequestData(value: unknown) {
  if (!value) return {};
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new ApiError(400, 'Request data must be valid JSON.');
  }
}

function parseBoolean(value: unknown) {
  return value === true || value === 'true';
}

export const listRequests = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const filter = requestFilterFromQuery(req.query);

  if (!canAdmin(session.activeRole)) {
    if (isPrivilegedReader(session.activeRole)) {
      filter.$or = [
        ...(filter.$or || []),
        { currentAssignedRole: session.activeRole },
        { 'approvalHistory.role': session.activeRole },
        { requester: session.userId }
      ];
    } else {
      filter.requester = session.userId;
    }
  }

  const [items, total] = await Promise.all([
    RequestModel.find(filter)
      .populate('requestType requester', '-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    RequestModel.countDocuments(filter)
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

export const listMyRequests = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const filter = { ...requestFilterFromQuery(req.query), requester: session.userId };
  const items = await RequestModel.find(filter).populate('requestType').sort({ createdAt: -1 });
  res.json({ items });
});

export const getRequest = asyncHandler(async (req, res) => {
  const request = await getRequestByIdOrRequestId(String(req.params.id));
  if (!request) throw new ApiError(404, 'Request not found.');
  res.json(request);
});

export const createRequest = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const { requestType, title, description, amount, requestData, submit } = req.body;
  if (!requestType || !title || amount === undefined) throw new ApiError(400, 'Request type, title, and amount are required.');
  if (Number(amount) <= 0) throw new ApiError(400, 'Amount must be positive.');

  const type = await RequestTypeModel.findById(requestType);
  if (!type || !type.isActive) throw new ApiError(422, 'Request type is inactive or unavailable.');

  const documents = uploadedDocuments(req);
  const missingDocuments = parseBoolean(submit)
    ? (type.requiredDocuments || []).filter((documentName) => !documents.some((document) => document.description === documentName))
    : [];
  if (missingDocuments.length) {
    throw new ApiError(400, `Please upload required documents: ${missingDocuments.join(', ')}.`);
  }

  const request = await createRequestForUser({
    userId: session.userId,
    activeRole: session.activeRole,
    requestType,
    title,
    description,
    amount: Number(amount),
    requestData: parseRequestData(requestData),
    documents,
    submit: parseBoolean(submit)
  });

  if (request.currentAssignedRole) {
    await notifyRole({
      role: request.currentAssignedRole,
      title: 'New request assigned',
      message: `${request.requestId} is waiting for your review.`,
      relatedRequest: request._id.toString()
    });
  }

  await writeAuditLog({
    actor: session.userId,
    actorRole: session.activeRole,
    action: parseBoolean(submit) ? 'SUBMIT_REQUEST' : 'CREATE_DRAFT',
    entityType: 'Request',
    entityId: request._id.toString(),
    description: `${request.requestId} ${parseBoolean(submit) ? 'submitted' : 'saved as draft'}.`
  });

  res.status(201).json(request);
});

export const updateRequest = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');
  if (request.requester.toString() !== session.userId) throw new ApiError(403, 'Only the requester can edit this request.');
  if (![REQUEST_STATUSES.DRAFT, REQUEST_STATUSES.REJECTED].includes(request.status as any)) {
    throw new ApiError(422, 'Only drafts or rejected requests can be edited.');
  }

  const allowed = ['requestType', 'title', 'description', 'amount', 'requestData'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) (request as any)[key] = req.body[key];
  }
  await request.save();
  res.json(await request.populate('requestType'));
});

export const submitRequest = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');
  if (request.requester.toString() !== session.userId) throw new ApiError(403, 'Only the requester can submit this request.');
  if (request.status !== REQUEST_STATUSES.DRAFT) throw new ApiError(422, 'Only draft requests can be submitted.');

  request.status = REQUEST_STATUSES.SUBMITTED;
  await initializeWorkflow(request);
  await request.save();
  if (request.currentAssignedRole) {
    await notifyRole({
      role: request.currentAssignedRole,
      title: 'New request assigned',
      message: `${request.requestId} is waiting for your review.`,
      relatedRequest: request._id.toString()
    });
  }
  res.json(await request.populate('requestType requester', '-passwordHash'));
});

export const resubmitRequest = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');
  if (request.requester.toString() !== session.userId) throw new ApiError(403, 'Only the requester can resubmit this request.');
  if (request.status !== REQUEST_STATUSES.REJECTED) throw new ApiError(422, 'Only rejected requests can be resubmitted.');

  if (req.body.title) request.title = req.body.title;
  if (req.body.description !== undefined) request.description = req.body.description;
  if (req.body.amount !== undefined) request.amount = Number(req.body.amount);
  if (req.body.requestData) request.requestData = req.body.requestData;

  await restartWorkflowForResubmission(request);
  if (request.currentAssignedRole) {
    await notifyRole({
      role: request.currentAssignedRole,
      title: 'Request resubmitted',
      message: `${request.requestId} was resubmitted and is waiting for review.`,
      relatedRequest: request._id.toString()
    });
  }
  res.json(await request.populate('requestType requester', '-passwordHash'));
});

export const uploadDocument = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');
  if (!req.file) throw new ApiError(400, 'File upload is required.');
  const isRequester = request.requester.toString() === session.userId;
  const isCurrentOwner = request.currentAssignedRole === session.activeRole;
  if (!isRequester && !isCurrentOwner) throw new ApiError(403, 'You cannot upload documents to this request.');

  attachUploadedFile(req, request, req.body.description);
  await request.save();
  res.status(201).json(request.documents[request.documents.length - 1]);
});

export const respondClarification = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');
  if (request.requester.toString() !== session.userId) throw new ApiError(403, 'Only the requester can respond to clarification.');
  attachUploadedFile(req, request, req.body.documentDescription);
  const updated = await returnFromClarification({
    request,
    userId: session.userId,
    activeRole: session.activeRole,
    remarks: req.body.remarks || 'Clarification response submitted.'
  });

  if (updated.currentAssignedRole) {
    await notifyRole({
      role: updated.currentAssignedRole,
      title: 'Clarification response received',
      message: `${updated.requestId} has been returned for your review.`,
      relatedRequest: updated._id.toString()
    });
  }
  res.json(await updated.populate('requestType requester', '-passwordHash'));
});

export const cancelDraft = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');
  if (request.requester.toString() !== session.userId) throw new ApiError(403, 'Only the requester can cancel this draft.');
  if (request.status !== REQUEST_STATUSES.DRAFT) throw new ApiError(422, 'Only draft requests can be cancelled.');
  request.status = REQUEST_STATUSES.CANCELLED;
  request.approvalHistory.push({
    action: 'CANCEL_DRAFT',
    role: session.activeRole,
    user: session.userId,
    remarks: 'Draft cancelled by requester.',
    fromStatus: REQUEST_STATUSES.DRAFT,
    toStatus: REQUEST_STATUSES.CANCELLED,
    createdAt: new Date()
  });
  await request.save();
  res.json(request);
});

export const downloadRequestSummary = asyncHandler(async (req, res) => {
  const request = await getRequestByIdOrRequestId(String(req.params.id));
  if (!request) throw new ApiError(404, 'Request not found.');
  res.json({
    message: 'PDF summary generation is available through report exports in this MVP.',
    request
  });
});
