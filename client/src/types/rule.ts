import type { Role } from './auth';
import type { RequestType } from './request';

export type RequestRuleOption = {
  _id: string;
  name: string;
  requestTypes: RequestType[];
  minAmount: number;
  maxAmount?: number | null;
  requiredDocuments?: string[] | null;
  acceptedFileTypes?: string[];
};

export type ApprovalRule = {
  _id: string;
  name: string;
  requestTypes: RequestType[];
  minAmount: number;
  maxAmount?: number | null;
  workflowRoles: Role[];
  requiredDocuments?: string[] | null;
  acceptedFileTypes?: string[];
  includeFinanceReview: boolean;
  approvingAuthorityRole?: Role;
  priority: number;
  isActive: boolean;
};
