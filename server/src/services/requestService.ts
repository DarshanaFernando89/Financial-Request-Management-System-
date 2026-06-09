import { RequestModel } from '../models/Request.js';
import { UserModel } from '../models/User.js';
import { generateRequestId } from '../utils/generateRequestId.js';
import { DEFAULT_CURRENCY, REQUEST_STATUSES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { initializeWorkflow } from './workflowService.js';

export async function createRequestForUser(input: {
  userId: string;
  activeRole: string;
  requestType: string;
  title: string;
  description?: string;
  amount: number;
  requestData?: Record<string, unknown>;
  documents?: unknown[];
  submit?: boolean;
}) {
  const user = await UserModel.findById(input.userId);
  if (!user) throw new ApiError(404, 'User not found.');

  const request = new RequestModel({
    requestId: await generateRequestId(),
    requester: user._id,
    requesterSnapshot: {
      name: user.nameWithInitials || user.fullName,
      email: user.email,
      department: user.department,
      faculty: user.faculty,
      staffCategory: user.staffCategory,
      roleAtSubmission: input.activeRole
    },
    requestType: input.requestType,
    title: input.title,
    description: input.description,
    amount: input.amount,
    currency: DEFAULT_CURRENCY,
    requestData: input.requestData || {},
    documents: input.documents || [],
    status: input.submit ? REQUEST_STATUSES.SUBMITTED : REQUEST_STATUSES.DRAFT
  });

  if (input.submit) {
    await initializeWorkflow(request);
  }

  await request.save();
  return request.populate('requestType requester', '-passwordHash');
}
