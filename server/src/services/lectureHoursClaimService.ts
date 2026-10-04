import { RequestModel } from '../models/Request.js';
import { REQUEST_STATUSES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { duplicateLectureHoursClaimMessage, lectureHoursClaimKey } from '../utils/lectureHoursClaim.js';

export async function assertNoDuplicateLectureHoursClaim(input: {
  requesterId: string;
  requestTypeCode?: string;
  requestTypeName?: string;
  requestData: Record<string, unknown>;
  excludeRequestId?: string;
}) {
  const key = lectureHoursClaimKey(input.requestTypeCode, input.requestData, input.requestTypeName);
  if (!key) return undefined;

  const duplicate = await RequestModel.findOne({
    requester: input.requesterId,
    lectureHoursClaimKey: key,
    status: { $nin: [REQUEST_STATUSES.REJECTED, REQUEST_STATUSES.CANCELLED] },
    ...(input.excludeRequestId ? { _id: { $ne: input.excludeRequestId } } : {})
  }).select('status requestId');
  if (duplicate) throw new ApiError(409, duplicateLectureHoursClaimMessage(duplicate.status));
  return key;
}
