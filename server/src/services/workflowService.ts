import type { Types } from 'mongoose';
import { ApprovalRuleModel } from '../models/ApprovalRule.js';
import { RequestModel } from '../models/Request.js';
import {
  APPROVAL_ACTIONS,
  REQUEST_STATUSES,
  ROLES,
  STEP_STATUSES,
  STEP_TYPES
} from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';

type BuildWorkflowInput = {
  workflowRoles: string[];
  includeFinanceReview?: boolean;
  approvingAuthorityRole?: string;
};

export function getStepType(role: string) {
  if (role === ROLES.DEPARTMENT_COORDINATOR) return STEP_TYPES.VERIFICATION;
  if (role === ROLES.FINANCE_DIVISION) return STEP_TYPES.FINANCE_REVIEW;
  if (role === ROLES.FINANCE_OFFICER) return STEP_TYPES.PAYMENT;
  return STEP_TYPES.APPROVAL;
}

export function buildWorkflowSteps(input: BuildWorkflowInput) {
  const roles = [...input.workflowRoles];

  if (input.includeFinanceReview && !roles.includes(ROLES.FINANCE_DIVISION)) {
    roles.push(ROLES.FINANCE_DIVISION);
  }

  if (input.approvingAuthorityRole && !roles.includes(input.approvingAuthorityRole)) {
    roles.push(input.approvingAuthorityRole);
  }

  const withoutPaymentRole = roles.filter((role) => role !== ROLES.FINANCE_OFFICER);
  const normalizedRoles = [...withoutPaymentRole, ROLES.FINANCE_OFFICER];

  return normalizedRoles.map((role, index) => ({
    stepIndex: index,
    role,
    stepType: getStepType(role),
    status: index === 0 ? STEP_STATUSES.PENDING : STEP_STATUSES.WAITING
  }));
}

export async function findMatchingRule(requestTypeId: string | Types.ObjectId, amount: number) {
  const rules = await ApprovalRuleModel.find({
    isActive: true,
    requestTypes: requestTypeId,
    minAmount: { $lte: amount },
    $or: [{ maxAmount: null }, { maxAmount: { $gte: amount } }]
  }).sort({ priority: 1, minAmount: -1 });

  return rules[0] || null;
}

export function getStatusForCurrentStep(step: any) {
  if (!step) return REQUEST_STATUSES.APPROVED;
  if (step.stepType === STEP_TYPES.VERIFICATION) return REQUEST_STATUSES.UNDER_VERIFICATION;
  if (step.stepType === STEP_TYPES.PAYMENT) return REQUEST_STATUSES.PAYMENT_PENDING;
  return REQUEST_STATUSES.UNDER_REVIEW;
}

export async function initializeWorkflow(request: any) {
  const rule = await findMatchingRule(request.requestType, request.amount);
  if (!rule) {
    throw new ApiError(422, 'No active approval rule matches this request type and amount.');
  }

  const workflowSteps = buildWorkflowSteps({
    workflowRoles: rule.workflowRoles,
    includeFinanceReview: rule.includeFinanceReview,
    approvingAuthorityRole: rule.approvingAuthorityRole
  });

  request.workflowSteps = workflowSteps;
  request.currentStepIndex = 0;
  request.currentAssignedRole = workflowSteps[0]?.role;
  request.status = getStatusForCurrentStep(workflowSteps[0]);
  request.submittedAt = request.submittedAt || new Date();
  return request;
}

export function assertCurrentRole(request: any, activeRole: string) {
  if (request.currentAssignedRole !== activeRole) {
    throw new ApiError(403, 'This request is not assigned to your active role.');
  }
}

export function getCurrentStep(request: any) {
  return request.workflowSteps?.find((step: any) => step.stepIndex === request.currentStepIndex);
}

export function addHistory(request: any, entry: any) {
  request.approvalHistory.push({
    ...entry,
    createdAt: new Date()
  });
}

export async function completeCurrentStep(input: {
  request: any;
  userId: string;
  activeRole: string;
  action: string;
  remarks?: string;
}) {
  const { request, userId, activeRole, action, remarks } = input;
  assertCurrentRole(request, activeRole);
  const currentStep = getCurrentStep(request);
  if (!currentStep) throw new ApiError(422, 'Request does not have an active workflow step.');
  if (currentStep.stepType === STEP_TYPES.PAYMENT) throw new ApiError(422, 'Use the finance payment action for payment steps.');

  const fromStatus = request.status;
  currentStep.status = STEP_STATUSES.COMPLETED;
  currentStep.action = action;
  currentStep.remarks = remarks;
  currentStep.actedBy = userId;
  currentStep.actedByRole = activeRole;
  currentStep.actedAt = new Date();

  const nextIndex = request.currentStepIndex + 1;
  const nextStep = request.workflowSteps.find((step: any) => step.stepIndex === nextIndex);

  if (nextStep) {
    nextStep.status = STEP_STATUSES.PENDING;
    request.currentStepIndex = nextIndex;
    request.currentAssignedRole = nextStep.role;
    request.status = getStatusForCurrentStep(nextStep);
  } else {
    request.currentAssignedRole = undefined;
    request.currentAssignedUser = undefined;
    request.status = REQUEST_STATUSES.APPROVED;
    request.completedAt = new Date();
  }

  addHistory(request, {
    action,
    role: activeRole,
    user: userId,
    remarks,
    fromStatus,
    toStatus: request.status
  });

  await request.save();
  return request;
}

export async function requestMoreInfo(input: { request: any; userId: string; activeRole: string; remarks: string }) {
  const { request, userId, activeRole, remarks } = input;
  if (!remarks?.trim()) throw new ApiError(400, 'Remarks are required when requesting more information.');
  assertCurrentRole(request, activeRole);

  const currentStep = getCurrentStep(request);
  if (!currentStep) throw new ApiError(422, 'Request does not have an active workflow step.');

  const fromStatus = request.status;
  currentStep.status = STEP_STATUSES.INFO_REQUESTED;
  currentStep.action = APPROVAL_ACTIONS.REQUEST_INFO;
  currentStep.remarks = remarks;
  currentStep.actedBy = userId;
  currentStep.actedByRole = activeRole;
  currentStep.actedAt = new Date();

  request.previousAssignedRoleWhenInfoRequested = activeRole;
  request.status = REQUEST_STATUSES.INFO_REQUESTED;
  request.currentAssignedRole = undefined;
  request.clarificationHistory.push({
    action: APPROVAL_ACTIONS.REQUEST_INFO,
    role: activeRole,
    user: userId,
    remarks,
    fromStatus,
    toStatus: request.status,
    createdAt: new Date()
  });
  addHistory(request, {
    action: APPROVAL_ACTIONS.REQUEST_INFO,
    role: activeRole,
    user: userId,
    remarks,
    fromStatus,
    toStatus: request.status
  });

  await request.save();
  return request;
}

export async function rejectRequest(input: { request: any; userId: string; activeRole: string; remarks: string }) {
  const { request, userId, activeRole, remarks } = input;
  if (!remarks?.trim()) throw new ApiError(400, 'Reject reason is required.');
  assertCurrentRole(request, activeRole);

  const currentStep = getCurrentStep(request);
  const fromStatus = request.status;
  if (currentStep) {
    currentStep.status = STEP_STATUSES.REJECTED;
    currentStep.action = APPROVAL_ACTIONS.REJECT;
    currentStep.remarks = remarks;
    currentStep.actedBy = userId;
    currentStep.actedByRole = activeRole;
    currentStep.actedAt = new Date();
  }

  request.status = REQUEST_STATUSES.REJECTED;
  request.currentAssignedRole = undefined;
  request.currentAssignedUser = undefined;
  request.rejectionReason = remarks;
  addHistory(request, {
    action: APPROVAL_ACTIONS.REJECT,
    role: activeRole,
    user: userId,
    remarks,
    fromStatus,
    toStatus: request.status
  });

  await request.save();
  return request;
}

export async function returnFromClarification(input: { request: any; userId: string; activeRole: string; remarks: string }) {
  const { request, userId, activeRole, remarks } = input;
  if (request.status !== REQUEST_STATUSES.INFO_REQUESTED) {
    throw new ApiError(422, 'This request is not waiting for clarification.');
  }

  const currentStep = getCurrentStep(request);
  if (!currentStep) throw new ApiError(422, 'Request does not have an active workflow step.');

  const fromStatus = request.status;
  currentStep.status = STEP_STATUSES.PENDING;
  request.currentAssignedRole = request.previousAssignedRoleWhenInfoRequested || currentStep.role;
  request.status = getStatusForCurrentStep(currentStep);
  request.clarificationHistory.push({
    action: APPROVAL_ACTIONS.RESPOND_CLARIFICATION,
    role: activeRole,
    user: userId,
    remarks,
    fromStatus,
    toStatus: request.status,
    createdAt: new Date()
  });
  addHistory(request, {
    action: APPROVAL_ACTIONS.RESPOND_CLARIFICATION,
    role: activeRole,
    user: userId,
    remarks,
    fromStatus,
    toStatus: request.status
  });

  await request.save();
  return request;
}

export async function restartWorkflowForResubmission(request: any) {
  request.revisionNo += 1;
  request.rejectionReason = undefined;
  request.resubmittedAt = new Date();
  request.workflowSteps = [];
  request.approvalHistory.push({
    action: APPROVAL_ACTIONS.RESUBMIT,
    role: request.requesterSnapshot?.roleAtSubmission,
    user: request.requester,
    remarks: 'Request resubmitted after rejection.',
    fromStatus: request.status,
    toStatus: REQUEST_STATUSES.SUBMITTED,
    createdAt: new Date()
  });
  await initializeWorkflow(request);
  await request.save();
  return request;
}

export async function getRequestByIdOrRequestId(id: string) {
  const query = id.match(/^[a-f\d]{24}$/i) ? { _id: id } : { requestId: id };
  return RequestModel.findOne(query).populate('requestType requester', '-passwordHash');
}
