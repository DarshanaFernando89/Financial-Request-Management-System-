import { AccountRequestModel } from '../models/AccountRequest.js';
import { UserModel } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ACCOUNT_REQUEST_STATUSES } from '../utils/constants.js';
import { getAccountRequestValidationError, normalizeAccountRequestPayload } from '../utils/accountRequestValidation.js';
import { notifyAdmins } from './notificationService.js';

export async function submitAccountRequest(input: Record<string, unknown>) {
  const payload = normalizeAccountRequestPayload(input);
  const validationError = getAccountRequestValidationError(payload);
  if (validationError) throw new ApiError(400, validationError);

  const existingUser = await UserModel.exists({ email: payload.email });
  if (existingUser) throw new ApiError(409, 'An account already exists for this email address.');

  const existingPendingRequest = await AccountRequestModel.exists({
    email: payload.email,
    status: ACCOUNT_REQUEST_STATUSES.PENDING
  });
  if (existingPendingRequest) throw new ApiError(409, 'An account request for this email address is already pending review.');

  const accountRequest = await AccountRequestModel.create({
    ...payload,
    status: ACCOUNT_REQUEST_STATUSES.PENDING
  });

  await notifyAdmins('New account request', `${payload.fullName} requested access as ${payload.requestedRole}.`, {
    type: 'ACCOUNT_REQUEST',
    relatedAccountRequest: accountRequest._id.toString()
  });
  return accountRequest;
}
