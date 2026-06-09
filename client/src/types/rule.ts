import type { Role } from './auth';
import type { RequestType } from './request';

export type ApprovalRule = {
  _id: string;
  name: string;
  requestTypes: RequestType[];
  minAmount: number;
  maxAmount?: number | null;
  workflowRoles: Role[];
  includeFinanceReview: boolean;
  approvingAuthorityRole?: Role;
  priority: number;
  isActive: boolean;
};
