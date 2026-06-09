import type { RequestStatus } from '../types/request';

export const statusLabels: Record<RequestStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_VERIFICATION: 'Under Verification',
  UNDER_REVIEW: 'Under Review',
  INFO_REQUESTED: 'Clarification Requested',
  REJECTED: 'Rejected',
  APPROVED: 'Approved',
  PAYMENT_PENDING: 'Pending Payment',
  PAID: 'Paid',
  CANCELLED: 'Cancelled'
};

export function statusLabel(status?: string) {
  return status ? statusLabels[status as RequestStatus] || status : '';
}
