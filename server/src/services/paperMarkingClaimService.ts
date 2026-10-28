import { RequestModel } from '../models/Request.js';
import { REQUEST_STATUSES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { duplicatePaperMarkingClaimMessage, isPaperMarkingPayment, paperMarkingClaimKey, paperMarkingClaimKeyForData } from '../utils/paperMarkingClaim.js';

export async function assertNoDuplicatePaperMarkingClaim(input: {
  requesterId: string;
  requestTypeCode?: string;
  requestTypeName?: string;
  requestData: Record<string, unknown>;
  excludeRequestId?: string;
}) {
  const key = paperMarkingClaimKey(input.requestTypeCode, input.requestData, input.requestTypeName);
  if (!key) return undefined;

  const filter = {
    requester: input.requesterId,
    status: { $nin: [REQUEST_STATUSES.REJECTED, REQUEST_STATUSES.CANCELLED] },
    ...(input.excludeRequestId ? { _id: { $ne: input.excludeRequestId } } : {})
  };
  const duplicate = await RequestModel.findOne({ ...filter, paperMarkingClaimKey: key }).select('status requestId');
  if (duplicate) throw new ApiError(409, duplicatePaperMarkingClaimMessage(duplicate.status, duplicate.requestId));

  const previousClaims = await RequestModel.find({
    ...filter,
    'requestData.batch': { $exists: true }
  }).select('status requestId requestData requestType paperMarkingClaimKey').populate('requestType', 'code name').lean();
  const conflict = previousClaims.find((claim: any) =>
    isPaperMarkingPayment(claim.requestType?.code, claim.requestType?.name) &&
    paperMarkingClaimKeyForData(claim.requestData || {}) === key
  );
  if (conflict) throw new ApiError(409, duplicatePaperMarkingClaimMessage(conflict.status, conflict.requestId));
  return key;
}
