import type { Role, StaffCategory, User } from './auth';

export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'INFO_REQUESTED'
  | 'REJECTED'
  | 'APPROVED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'CANCELLED';

export type RequestField = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file';
  required: boolean;
  options?: string[];
  placeholder?: string;
};

export type RequestType = {
  _id: string;
  name: string;
  code: string;
  description?: string;
  fields: RequestField[];
  requiredDocuments: string[];
  isActive: boolean;
};

export type RequestDocument = {
  _id?: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedBy?: string;
  uploadedByRole?: Role;
  uploadedAt?: string;
  description?: string;
  source?: 'INITIAL_SUBMISSION' | 'MANUAL_UPLOAD' | 'CLARIFICATION_RESPONSE';
  clarificationRound?: number;
  clarificationRespondedAt?: string;
};

export type WorkflowStep = {
  _id?: string;
  stepIndex: number;
  role: Role;
  stepType: 'VERIFICATION' | 'APPROVAL' | 'FINANCE_REVIEW' | 'PAYMENT';
  status: 'WAITING' | 'PENDING' | 'COMPLETED' | 'INFO_REQUESTED' | 'REJECTED' | 'SKIPPED';
  action?: string;
  remarks?: string;
  actedAt?: string;
};

export type HistoryEntry = {
  _id?: string;
  action: string;
  role?: Role;
  user?: string | User;
  remarks?: string;
  fromStatus?: RequestStatus;
  toStatus?: RequestStatus;
  createdAt?: string;
};

export type FinancialRequest = {
  _id: string;
  requestId: string;
  requester: string | User;
  requesterSnapshot: {
    name: string;
    email: string;
    department: string;
    faculty: string;
    staffCategory: StaffCategory;
    roleAtSubmission: Role;
  };
  requestType: string | RequestType;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  requestData: Record<string, unknown>;
  documents: RequestDocument[];
  status: RequestStatus;
  currentStepIndex: number;
  workflowSteps: WorkflowStep[];
  currentAssignedRole?: Role;
  previousAssignedRoleWhenInfoRequested?: Role;
  approvalHistory: HistoryEntry[];
  clarificationHistory: HistoryEntry[];
  rejectionReason?: string;
  payment?: {
    paidAt?: string;
    amount?: number;
    referenceNo?: string;
    remarks?: string;
  };
  revisionNo: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  resubmittedAt?: string;
  completedAt?: string;
};

export type RequestListResponse = {
  items: FinancialRequest[];
  total?: number;
  page?: number;
  pages?: number;
};
