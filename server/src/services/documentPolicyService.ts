import { ApprovalRuleModel } from '../models/ApprovalRule.js';
import { RequestTypeModel } from '../models/RequestType.js';
import { findMatchingRule } from './workflowService.js';
import { documentPolicy } from '../utils/documentPolicy.js';

export async function getDocumentPolicy(request: any) {
  const type = await RequestTypeModel.findById(request.requestType?._id || request.requestType);
  const rule = request.approvalRule
    ? await ApprovalRuleModel.findById(request.approvalRule)
    : await findMatchingRule(request.requestType?._id || request.requestType, request.amount);
  return documentPolicy(rule, type);
}
