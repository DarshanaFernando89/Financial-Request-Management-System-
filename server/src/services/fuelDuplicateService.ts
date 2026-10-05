import { RequestModel } from '../models/Request.js';
import { RequestTypeModel } from '../models/RequestType.js';
import { REQUEST_STATUSES, REQUEST_TYPE_CODES } from '../utils/constants.js';

export async function findDuplicateFuelRequests(
  requesterId: string,
  requestTypeId: string,
  amount: number,
  excludeRequestId?: string
) {
  const requestType = await RequestTypeModel.findById(requestTypeId).select('code');
  if (requestType?.code !== REQUEST_TYPE_CODES.TRAVEL_FUEL) return [];

  return RequestModel.find({
    requester: requesterId,
    requestType: requestTypeId,
    amount,
    status: { $ne: REQUEST_STATUSES.CANCELLED },
    ...(excludeRequestId ? { _id: { $ne: excludeRequestId } } : {})
  })
    .select('requestId title amount status createdAt')
    .sort({ createdAt: 1 })
    .lean();
}