import { ApprovalModel } from '../models/Approval.js';
import { RequestModel } from '../models/Request.js';
import { APPROVAL_ACTIONS, REQUEST_STATUSES } from '../utils/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { completeCurrentStep, rejectRequest, requestMoreInfo } from '../services/workflowService.js';
import { notifyRole, notifyUser } from '../services/notificationService.js';
import { writeAuditLog } from '../services/auditService.js';

const activeReviewStatuses = [
  REQUEST_STATUSES.SUBMITTED,
  REQUEST_STATUSES.UNDER_VERIFICATION,
  REQUEST_STATUSES.UNDER_REVIEW
];

export const pendingApprovals = asyncHandler(async (req, res) => {
  const activeRole = (req as any).user.activeRole;
  const items = await RequestModel.find({
    currentAssignedRole: activeRole,
    status: { $in: activeReviewStatuses }
  })
    .populate('requestType requester', '-passwordHash')
    .sort({ submittedAt: 1, createdAt: 1 });
  res.json({ items });
});

export const approvalHistory = asyncHandler(async (req, res) => {
  const activeRole = (req as any).user.activeRole;
  const items = await RequestModel.find({ 'approvalHistory.role': activeRole }).populate('requestType requester', '-passwordHash');
  res.json({ items });
});

async function loadRequest(id: string) {
  const request = await RequestModel.findOne(id.match(/^[a-f\d]{24}$/i) ? { _id: id } : { requestId: id });
  if (!request) throw new ApiError(404, 'Request not found.');
  if ([REQUEST_STATUSES.PAID, REQUEST_STATUSES.CANCELLED, REQUEST_STATUSES.REJECTED].includes(request.status as any)) {
    throw new ApiError(422, 'No further approval action is allowed for this request.');
  }
  return request;
}

async function recordApproval(request: any, action: string, session: any, remarks?: string) {
  await ApprovalModel.create({
    request: request._id,
    action,
    role: session.activeRole,
    user: session.userId,
    remarks
  });
  await writeAuditLog({
    actor: session.userId,
    actorRole: session.activeRole,
    action,
    entityType: 'Request',
    entityId: request._id.toString(),
    description: `${request.requestId}: ${action}`
  });
}

export const approve = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await loadRequest(String(req.params.requestId));
  const updated = await completeCurrentStep({
    request,
    userId: session.userId,
    activeRole: session.activeRole,
    action: APPROVAL_ACTIONS.APPROVE,
    remarks: req.body.remarks
  });
  await recordApproval(updated, APPROVAL_ACTIONS.APPROVE, session, req.body.remarks);
  if (updated.currentAssignedRole) {
    await notifyRole({
      role: updated.currentAssignedRole,
      title: 'Request assigned',
      message: `${updated.requestId} is waiting for your action.`,
      relatedRequest: updated._id.toString()
    });
  } else {
    await notifyUser({
      user: updated.requester.toString(),
      title: 'Request approved',
      message: `${updated.requestId} has been approved.`,
      relatedRequest: updated._id.toString()
    });
  }
  res.json(await updated.populate('requestType requester', '-passwordHash'));
});

export const verifyForward = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await loadRequest(String(req.params.requestId));
  const updated = await completeCurrentStep({
    request,
    userId: session.userId,
    activeRole: session.activeRole,
    action: APPROVAL_ACTIONS.VERIFY_FORWARD,
    remarks: req.body.remarks
  });
  await recordApproval(updated, APPROVAL_ACTIONS.VERIFY_FORWARD, session, req.body.remarks);
  if (updated.currentAssignedRole) {
    await notifyRole({
      role: updated.currentAssignedRole,
      title: 'Verified request forwarded',
      message: `${updated.requestId} is waiting for your action.`,
      relatedRequest: updated._id.toString()
    });
  }
  res.json(await updated.populate('requestType requester', '-passwordHash'));
});

export const requestInfo = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await loadRequest(String(req.params.requestId));
  const updated = await requestMoreInfo({
    request,
    userId: session.userId,
    activeRole: session.activeRole,
    remarks: req.body.remarks
  });
  await recordApproval(updated, APPROVAL_ACTIONS.REQUEST_INFO, session, req.body.remarks);
  await notifyUser({
    user: updated.requester.toString(),
    title: 'Clarification Requested',
    message: `${updated.requestId} requires more information.`,
    relatedRequest: updated._id.toString()
  });
  res.json(await updated.populate('requestType requester', '-passwordHash'));
});

export const reject = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const request = await loadRequest(String(req.params.requestId));
  const updated = await rejectRequest({
    request,
    userId: session.userId,
    activeRole: session.activeRole,
    remarks: req.body.remarks || req.body.reason
  });
  await recordApproval(updated, APPROVAL_ACTIONS.REJECT, session, req.body.remarks || req.body.reason);
  await notifyUser({
    user: updated.requester.toString(),
    title: 'Request rejected',
    message: `${updated.requestId} was rejected.`,
    relatedRequest: updated._id.toString()
  });
  res.json(await updated.populate('requestType requester', '-passwordHash'));
});
