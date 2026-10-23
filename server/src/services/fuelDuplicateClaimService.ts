import { RequestModel } from '../models/Request.js';
import { REQUEST_STATUSES, REQUEST_TYPE_CODES } from '../utils/constants.js';

const excludedStatuses = [
  REQUEST_STATUSES.DRAFT,
  REQUEST_STATUSES.REJECTED,
  REQUEST_STATUSES.CANCELLED
];

export async function findDuplicateFuelClaim(input: {
  requesterId: string;
  requestTypeId: string;
  requestTypeCode?: string;
  requestTypeName?: string;
  amount: number;
  excludeRequestId?: string;
}) {
  const isFuelClaim = input.requestTypeCode === REQUEST_TYPE_CODES.TRAVEL_FUEL ||
    input.requestTypeName?.trim().toLocaleLowerCase() === 'travel / fuel claims';
  if (!isFuelClaim || !Number.isFinite(input.amount) || input.amount <= 0) return undefined;

  return RequestModel.findOne({
    requester: input.requesterId,
    requestType: input.requestTypeId,
    amount: Number(input.amount.toFixed(2)),
    status: { $nin: excludedStatuses },
    ...(input.excludeRequestId ? { _id: { $ne: input.excludeRequestId } } : {})
  }).select('requestId');
}

export function fuelDuplicateWarning(requestId?: string) {
  return `Warning: You may have submitted the same fuel claim more than once. Please check before proceeding.${requestId ? ` Similar request ID: ${requestId}.` : ''}`;
}
