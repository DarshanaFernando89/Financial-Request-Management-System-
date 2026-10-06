import { RequestModel } from '../models/Request.js';
import { REQUEST_STATUSES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { duplicateLectureHoursClaimMessage, isLectureHoursPayment, lectureHoursClaimKey, lectureHoursClaimsShareSlot, lectureHoursSlotKeys } from '../utils/lectureHoursClaim.js';

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
  if (duplicate) throw new ApiError(409, duplicateLectureHoursClaimMessage(duplicate.status, duplicate.requestId));
  if (lectureHoursSlotKeys(input.requestData).length) {
    const previousClaims = await RequestModel.find({
      requester: input.requesterId,
      status: { $nin: [REQUEST_STATUSES.REJECTED, REQUEST_STATUSES.CANCELLED] },
      $or: [
        { 'requestData.lectureTimeSlots': { $exists: true } },
        { 'requestData.timeSlots': { $exists: true } }
      ],
      ...(input.excludeRequestId ? { _id: { $ne: input.excludeRequestId } } : {})
    }).select('status requestId requestData requestType lectureHoursClaimKey').populate('requestType', 'code name').lean();
    const conflicts = previousClaims.filter((claim: any) =>
      (claim.lectureHoursClaimKey || isLectureHoursPayment(claim.requestType?.code, claim.requestType?.name)) &&
      lectureHoursClaimsShareSlot(input.requestData, claim.requestData || {})
    );
    const conflict = conflicts.find((claim) => claim.status === REQUEST_STATUSES.PAID) || conflicts[0];
    if (conflict) throw new ApiError(409, duplicateLectureHoursClaimMessage(conflict.status, conflict.requestId));
  }
  return key;
}
