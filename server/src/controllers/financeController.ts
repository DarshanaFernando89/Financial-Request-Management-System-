import { PaymentModel } from '../models/Payment.js';
import { RequestModel } from '../models/Request.js';
import { APPROVAL_ACTIONS, REQUEST_STATUSES, STEP_STATUSES } from '../utils/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getCurrentStep, rejectRequest, requestMoreInfo } from '../services/workflowService.js';
import { notifyUser } from '../services/notificationService.js';
import { writeAuditLog } from '../services/auditService.js';
import { buildPaymentReceiptPdfBuffer } from '../services/reportService.js';

export const pendingPayments = asyncHandler(async (_req, res) => {
  const items = await RequestModel.find({
    currentAssignedRole: 'FINANCE_OFFICER',
    status: REQUEST_STATUSES.PAYMENT_PENDING
  })
    .populate('requestType requester', '-passwordHash')
    .sort({ updatedAt: 1 });
  res.json({ items });
});

export const paymentHistory = asyncHandler(async (_req, res) => {
  const items = await PaymentModel.find().populate({ path: 'request', populate: { path: 'requestType requester' } }).sort({ paidAt: -1 });
  res.json({ items });
});

export const financeRequestDetails = asyncHandler(async (req, res) => {
  const requestId = String(req.params.requestId);
  const request = await RequestModel.findOne(
    requestId.match(/^[a-f\d]{24}$/i) ? { _id: requestId } : { requestId }
  ).populate('requestType requester', '-passwordHash');
  if (!request) throw new ApiError(404, 'Request not found.');
  res.json(request);
});

export const markPaid = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const requestId = String(req.params.requestId);
  const request = await RequestModel.findOne(
    requestId.match(/^[a-f\d]{24}$/i) ? { _id: requestId } : { requestId }
  );
  if (!request) throw new ApiError(404, 'Request not found.');
  if (request.status !== REQUEST_STATUSES.PAYMENT_PENDING || request.currentAssignedRole !== session.activeRole) {
    throw new ApiError(422, 'This request is not ready for payment by your active role.');
  }
  if (!req.body.paidAt && !req.body.paymentDate) throw new ApiError(400, 'Payment date is required.');
  if (!req.body.referenceNo && !req.body.paymentReferenceNo) throw new ApiError(400, 'Payment reference number is required.');

  const amount = Number(req.body.amount || request.amount);
  if (amount <= 0) throw new ApiError(400, 'Payment amount must be positive.');

  const currentStep = getCurrentStep(request);
  if (currentStep) {
    currentStep.status = STEP_STATUSES.COMPLETED;
    currentStep.action = APPROVAL_ACTIONS.MARK_PAID;
    currentStep.remarks = req.body.remarks;
    currentStep.actedBy = session.userId;
    currentStep.actedByRole = session.activeRole;
    currentStep.actedAt = new Date();
  }

  const paidAt = new Date(req.body.paidAt || req.body.paymentDate);
  const referenceNo = req.body.referenceNo || req.body.paymentReferenceNo;
  const payment = await PaymentModel.create({
    request: request._id,
    amount,
    paidAt,
    referenceNo,
    remarks: req.body.remarks,
    processedBy: session.userId
  });

  request.payment = {
    paidAt,
    paidBy: session.userId,
    amount,
    referenceNo,
    remarks: req.body.remarks
  } as any;
  request.status = REQUEST_STATUSES.PAID;
  request.currentAssignedRole = undefined;
  request.currentAssignedUser = undefined;
  request.completedAt = new Date();
  request.approvalHistory.push({
    action: APPROVAL_ACTIONS.MARK_PAID,
    role: session.activeRole,
    user: session.userId,
    remarks: req.body.remarks,
    fromStatus: REQUEST_STATUSES.PAYMENT_PENDING,
    toStatus: REQUEST_STATUSES.PAID,
    createdAt: new Date()
  });
  await request.save();

  await writeAuditLog({
    actor: session.userId,
    actorRole: session.activeRole,
    action: APPROVAL_ACTIONS.MARK_PAID,
    entityType: 'Request',
    entityId: request._id.toString(),
    description: `${request.requestId} marked as paid.`
  });
  await notifyUser({
    user: request.requester.toString(),
    title: 'Payment processed',
    message: `${request.requestId} has been marked as paid.`,
    relatedRequest: request._id.toString()
  });

  res.json({ request: await request.populate('requestType requester', '-passwordHash'), payment });
});

export const financeRequestInfo = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const requestId = String(req.params.requestId);
  const request = await RequestModel.findOne(
    requestId.match(/^[a-f\d]{24}$/i) ? { _id: requestId } : { requestId }
  );
  if (!request) throw new ApiError(404, 'Request not found.');
  const updated = await requestMoreInfo({
    request,
    userId: session.userId,
    activeRole: session.activeRole,
    remarks: req.body.remarks
  });
  await notifyUser({
    user: updated.requester.toString(),
    title: 'Clarification Requested',
    message: `${updated.requestId} requires payment clarification.`,
    relatedRequest: updated._id.toString()
  });
  res.json(updated);
});

export const financeReject = asyncHandler(async (req, res) => {
  const session = (req as any).user;
  const requestId = String(req.params.requestId);
  const request = await RequestModel.findOne(
    requestId.match(/^[a-f\d]{24}$/i) ? { _id: requestId } : { requestId }
  );
  if (!request) throw new ApiError(404, 'Request not found.');
  const updated = await rejectRequest({
    request,
    userId: session.userId,
    activeRole: session.activeRole,
    remarks: req.body.remarks || req.body.reason
  });
  await notifyUser({
    user: updated.requester.toString(),
    title: 'Request rejected by Finance',
    message: `${updated.requestId} was rejected during finance processing.`,
    relatedRequest: updated._id.toString()
  });
  res.json(updated);
});

export const exportPaymentReceipt = asyncHandler(async (req, res) => {
  const requestId = String(req.params.requestId);
  const request = await RequestModel.findOne(
    requestId.match(/^[a-f\d]{24}$/i) ? { _id: requestId } : { requestId }
  ).populate('requestType requester', '-passwordHash');
  if (!request) throw new ApiError(404, 'Request not found.');

  const documents = request.documents || [];
  const buffer = await buildPaymentReceiptPdfBuffer(request, documents);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payment-receipt-${request.requestId}.pdf"`);
  res.send(buffer);
});
