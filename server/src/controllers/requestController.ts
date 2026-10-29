import { RequestModel } from '../models/Request.js';
import { RequestTypeModel } from '../models/RequestType.js';
import { APPROVAL_ACTIONS, REQUEST_STATUSES } from '../utils/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { canAdmin, isPrivilegedReader } from '../utils/permissions.js';
import { createRequestForUser } from '../services/requestService.js';
import {
  getRequestByIdOrRequestId,
  findMatchingRule,
  initializeWorkflow,
  restartWorkflowForResubmission,
  returnFromClarification
} from '../services/workflowService.js';
import { notifyRole, notifyUser } from '../services/notificationService.js';
import { writeAuditLog } from '../services/auditService.js';
import { buildStoredDocumentData, deleteUploadedFiles } from '../services/fileService.js';
import { assertNoDuplicateLectureHoursClaim } from '../services/lectureHoursClaimService.js';
import { prepareLectureHoursClaim } from '../utils/lectureHoursClaim.js';
import { assertNoDuplicatePaperMarkingClaim } from '../services/paperMarkingClaimService.js';
import { preparePaperMarkingClaim } from '../utils/paperMarkingClaim.js';
import { findDuplicateFuelClaim, fuelDuplicateWarning } from '../services/fuelDuplicateClaimService.js';
import { documentPolicy, assertAcceptedDocuments, assertRequiredDocuments } from '../utils/documentPolicy.js';
import { getDocumentPolicy } from '../services/documentPolicyService.js';

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
  const documentId = `${req.user.userId}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
  request.documents.push({
    ...buildStoredDocumentData(req.file, documentId, req.user, description),
    source: 'MANUAL_UPLOAD'
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

function parseDocumentIds(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
    } catch {
      return [value];
    }
  }
  return [String(value)];
}

function uploadedDocuments(
  req: any,
  options: { source?: 'INITIAL_SUBMISSION' | 'MANUAL_UPLOAD' | 'CLARIFICATION_RESPONSE'; clarificationRound?: number; clarificationRespondedAt?: Date } = {}
) {
  const descriptions = normalizeBodyList(req.body.documentDescriptions);
  return normalizeUploadedFiles(req).map((file: any, index: number) => {
    const documentId = `${req.user.userId}-${Date.now()}-${Math.round(Math.random() * 100000)}-${index}`;
    return {
      ...buildStoredDocumentData(file, documentId, req.user, descriptions[index]),
      source: options.source || 'INITIAL_SUBMISSION',
      clarificationRound: options.clarificationRound,
      clarificationRespondedAt: options.clarificationRespondedAt
    };
  });
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

function prepareRequestClaim(type: any, requestData: Record<string, unknown>) {
  const lectureClaim = prepareLectureHoursClaim(type.code, type.name, type.fields, requestData);
  const paperClaim = preparePaperMarkingClaim(type.code, type.name, type.fields, lectureClaim.requestData);
  return {
    requestData: paperClaim.requestData,
    amount: paperClaim.amount ?? lectureClaim.amount
  };
}

async function assertNoDuplicateClaims(input: {
  requesterId: string;
  type: any;
  requestData: Record<string, unknown>;
  excludeRequestId?: string;
}) {
  const common = {
    requesterId: input.requesterId,
    requestTypeCode: input.type.code,
    requestTypeName: input.type.name,
    requestData: input.requestData,
    excludeRequestId: input.excludeRequestId
  };
  const [lectureHoursClaimKey, paperMarkingClaimKey] = await Promise.all([
    assertNoDuplicateLectureHoursClaim(common),
    assertNoDuplicatePaperMarkingClaim(common)
  ]);
  return { lectureHoursClaimKey, paperMarkingClaimKey };
}

export const listRequests = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const filter = requestFilterFromQuery(req.query);

  if (!canAdmin(session.activeRole)) {
    if (isPrivilegedReader(session.activeRole, session.approvalRoles)) {
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
      .select('-documents.fileBuffer')
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
  const items = await RequestModel.find(filter).select('-documents.fileBuffer').populate('requestType').sort({ createdAt: -1 });
  res.json({ items });
});

export const checkDuplicateFuelClaim = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const requestTypeId = String(req.query.requestType || '');
  const amount = Number(req.query.amount);
  if (!requestTypeId || !Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'A request type and positive amount are required.');
  }
  const type = await RequestTypeModel.findById(requestTypeId);
  if (!type || !type.isActive) throw new ApiError(422, 'Request type is inactive or unavailable.');
  const duplicate = await findDuplicateFuelClaim({
    requesterId: session.userId,
    requestTypeId: type._id.toString(),
    requestTypeCode: type.code,
    requestTypeName: type.name,
    amount
  });
  res.json({ warning: duplicate ? fuelDuplicateWarning(duplicate.requestId) : undefined });
});

export const getRequest = asyncHandler(async (req, res) => {
  const request = await getRequestByIdOrRequestId(String(req.params.id));
  if (!request) throw new ApiError(404, 'Request not found.');
  res.json(request);
});

export const getRequestDocumentPolicy = asyncHandler(async (req, res) => {
  const request = await getRequestByIdOrRequestId(String(req.params.id));
  if (!request) throw new ApiError(404, 'Request not found.');
  res.json(await getDocumentPolicy(request));
});

export const downloadDocument = asyncHandler(async (req, res) => {
  const request = await RequestModel.findOne({ 'documents._id': req.params.documentId });
  if (!request) throw new ApiError(404, 'Document not found.');

  const document = request.documents.find((item: any) => item._id.toString() === req.params.documentId);
  if (!document || !document.fileBuffer) throw new ApiError(404, 'Document content is unavailable.');

  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName || document.filename || 'document')}"`);
  res.send(document.fileBuffer);
});

export const createRequest = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const { requestType, approvalRule, title, description, amount, requestData, submit } = req.body;
  if (!requestType || !title || amount === undefined) throw new ApiError(400, 'Request type, title, and amount are required.');

  const type = await RequestTypeModel.findById(requestType);
  if (!type || !type.isActive) throw new ApiError(422, 'Request type is inactive or unavailable.');
  const preparedClaim = prepareRequestClaim(type, parseRequestData(requestData));
  const requestAmount = preparedClaim.amount ?? Number(amount);
  if (!Number.isFinite(requestAmount) || requestAmount <= 0) throw new ApiError(400, 'Amount must be positive.');
  const rule = await findMatchingRule(requestType, requestAmount, approvalRule);
  if (approvalRule && !rule) {
    throw new ApiError(422, 'The selected approval rule is unavailable or does not match this request type and amount.');
  }

  const claimKeys = await assertNoDuplicateClaims({
    requesterId: session.userId,
    type,
    requestData: preparedClaim.requestData
  });
  const duplicateFuelClaim = await findDuplicateFuelClaim({
    requesterId: session.userId,
    requestTypeId: type._id.toString(),
    requestTypeCode: type.code,
    requestTypeName: type.name,
    amount: requestAmount
  });
  const documents = uploadedDocuments(req);
  const policy = documentPolicy(rule, type);
  assertAcceptedDocuments(documents, policy);
  if (parseBoolean(submit)) assertRequiredDocuments(documents, policy);

  const request = await createRequestForUser({
    userId: session.userId,
    activeRole: session.activeRole,
    requestType,
    approvalRule,
    title,
    description,
    amount: requestAmount,
    requestData: preparedClaim.requestData,
    ...claimKeys,
    duplicateWarning: duplicateFuelClaim ? fuelDuplicateWarning(duplicateFuelClaim.requestId) : undefined,
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

  const nextRequestType = req.body.requestType
    ? await RequestTypeModel.findById(req.body.requestType)
    : await RequestTypeModel.findById(request.requestType);
  if (!nextRequestType || !nextRequestType.isActive) throw new ApiError(422, 'Request type is inactive or unavailable.');
  const nextRequestData = (req.body.requestData ?? request.requestData) as Record<string, unknown>;
  const preparedClaim = prepareRequestClaim(nextRequestType, nextRequestData);
  const claimKeys = await assertNoDuplicateClaims({
    requesterId: session.userId,
    type: nextRequestType,
    requestData: preparedClaim.requestData,
    excludeRequestId: request._id.toString()
  });
  const duplicateFuelClaim = await findDuplicateFuelClaim({
    requesterId: session.userId,
    requestTypeId: nextRequestType._id.toString(),
    requestTypeCode: nextRequestType.code,
    requestTypeName: nextRequestType.name,
    amount: preparedClaim.amount ?? Number(req.body.amount ?? request.amount),
    excludeRequestId: request._id.toString()
  });
  const allowed = ['requestType', 'approvalRule', 'title', 'description', 'amount', 'requestData'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) (request as any)[key] = req.body[key];
  }
  request.requestData = preparedClaim.requestData;
  if (preparedClaim.amount !== undefined) request.amount = preparedClaim.amount;
  request.lectureHoursClaimKey = claimKeys.lectureHoursClaimKey;
  request.paperMarkingClaimKey = claimKeys.paperMarkingClaimKey;
  request.duplicateWarning = duplicateFuelClaim ? fuelDuplicateWarning(duplicateFuelClaim.requestId) : undefined;
  await request.save();
  res.json(await request.populate('requestType'));
});

export const submitRequest = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');
  if (request.requester.toString() !== session.userId) throw new ApiError(403, 'Only the requester can submit this request.');
  if (request.status !== REQUEST_STATUSES.DRAFT) throw new ApiError(422, 'Only draft requests can be submitted.');

  const type = await RequestTypeModel.findById(request.requestType);
  if (!type || !type.isActive) throw new ApiError(422, 'Request type is inactive or unavailable.');
  const preparedClaim = prepareRequestClaim(type, request.requestData);
  request.requestData = preparedClaim.requestData;
  if (preparedClaim.amount !== undefined) request.amount = preparedClaim.amount;
  const claimKeys = await assertNoDuplicateClaims({
    requesterId: session.userId,
    type,
    requestData: preparedClaim.requestData,
    excludeRequestId: request._id.toString()
  });
  request.lectureHoursClaimKey = claimKeys.lectureHoursClaimKey;
  request.paperMarkingClaimKey = claimKeys.paperMarkingClaimKey;
  const duplicateFuelClaim = await findDuplicateFuelClaim({
    requesterId: session.userId,
    requestTypeId: type._id.toString(),
    requestTypeCode: type.code,
    requestTypeName: type.name,
    amount: request.amount,
    excludeRequestId: request._id.toString()
  });
  request.duplicateWarning = duplicateFuelClaim ? fuelDuplicateWarning(duplicateFuelClaim.requestId) : undefined;

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

  const type = await RequestTypeModel.findById(request.requestType);
  if (!type || !type.isActive) throw new ApiError(422, 'Request type is inactive or unavailable.');
  const preparedClaim = prepareRequestClaim(type, request.requestData);
  request.requestData = preparedClaim.requestData;
  if (preparedClaim.amount !== undefined) request.amount = preparedClaim.amount;
  const claimKeys = await assertNoDuplicateClaims({
    requesterId: session.userId,
    type,
    requestData: preparedClaim.requestData,
    excludeRequestId: request._id.toString()
  });
  request.lectureHoursClaimKey = claimKeys.lectureHoursClaimKey;
  request.paperMarkingClaimKey = claimKeys.paperMarkingClaimKey;
  const duplicateFuelClaim = await findDuplicateFuelClaim({
    requesterId: session.userId,
    requestTypeId: type._id.toString(),
    requestTypeCode: type.code,
    requestTypeName: type.name,
    amount: request.amount,
    excludeRequestId: request._id.toString()
  });
  request.duplicateWarning = duplicateFuelClaim ? fuelDuplicateWarning(duplicateFuelClaim.requestId) : undefined;

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

  assertAcceptedDocuments([req.file], await getDocumentPolicy(request));
  attachUploadedFile(req, request, req.body.description);
  await request.save();
  res.status(201).json(request.documents[request.documents.length - 1]);
});

export const respondClarification = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await RequestModel.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');
  if (request.requester.toString() !== session.userId) throw new ApiError(403, 'Only the requester can respond to clarification.');
  if (request.status !== REQUEST_STATUSES.INFO_REQUESTED) throw new ApiError(422, 'This request is not waiting for clarification.');

  assertAcceptedDocuments(normalizeUploadedFiles(req), await getDocumentPolicy(request));

  const removeDocumentIds = new Set(parseDocumentIds(req.body.removeDocumentIds));
  const existingIds = new Set(request.documents.map((document: any) => document._id.toString()));
  const unknownIds = [...removeDocumentIds].filter((id) => !existingIds.has(id));
  if (unknownIds.length) throw new ApiError(400, 'One or more selected documents no longer exist. Refresh the request and try again.');

  const removedDocuments = request.documents
    .filter((document: any) => removeDocumentIds.has(document._id.toString()))
    .map((document: any) => ({ filename: document.filename, storageType: document.storageType }));
  if (removeDocumentIds.size) {
    request.documents = request.documents.filter((document: any) => !removeDocumentIds.has(document._id.toString())) as any;
  }
  const clarificationRound =
    request.clarificationHistory.filter((entry: any) => entry.action === APPROVAL_ACTIONS.REQUEST_INFO).length || 1;
  const clarificationRespondedAt = new Date();
  request.documents.push(...uploadedDocuments(req, {
    source: 'CLARIFICATION_RESPONSE',
    clarificationRound,
    clarificationRespondedAt
  }) as any);

  const updated = await returnFromClarification({
    request,
    userId: session.userId,
    activeRole: session.activeRole,
    remarks: req.body.remarks || 'Clarification response submitted.'
  });

  await deleteUploadedFiles(removedDocuments);

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
