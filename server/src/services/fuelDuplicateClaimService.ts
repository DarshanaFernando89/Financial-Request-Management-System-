import { RequestModel } from '../models/Request.js';
import { REQUEST_STATUSES, REQUEST_TYPE_CODES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';

const excludedStatuses = [
  REQUEST_STATUSES.DRAFT,
  REQUEST_STATUSES.REJECTED,
  REQUEST_STATUSES.CANCELLED
];

function isFuelClaim(requestTypeCode?: string, requestTypeName?: string) {
  return requestTypeCode === REQUEST_TYPE_CODES.TRAVEL_FUEL ||
    requestTypeName?.trim().toLocaleLowerCase() === 'travel / fuel claims';
}

function isValidTravelDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

export function assertFuelTravelDate(requestTypeCode: string, requestTypeName: string, requestData: Record<string, unknown>) {
  if (isFuelClaim(requestTypeCode, requestTypeName) && !isValidTravelDate(requestData.travelDate)) {
    throw new ApiError(400, 'Travel date is required for Travel / Fuel Claims.');
  }
}

export async function findDuplicateFuelClaim(input: {
  requesterId: string;
  requestTypeId: string;
  requestTypeCode?: string;
  requestTypeName?: string;
  amount: number;
  travelDate?: unknown;
  excludeRequestId?: string;
}) {
  if (
    !isFuelClaim(input.requestTypeCode, input.requestTypeName) ||
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    !isValidTravelDate(input.travelDate)
  ) return undefined;

  return RequestModel.findOne({
    requester: input.requesterId,
    requestType: input.requestTypeId,
    amount: Number(input.amount.toFixed(2)),
    'requestData.travelDate': input.travelDate,
    status: { $nin: excludedStatuses },
    ...(input.excludeRequestId ? { _id: { $ne: input.excludeRequestId } } : {})
  }).select('_id requestId');
}

export function fuelDuplicateWarning() {
  return 'Warning: You may have submitted a fuel claim with the same amount and travel date. Please check before proceeding.';
}
