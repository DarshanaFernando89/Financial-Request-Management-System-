import type { FinancialRequest } from './request';

export type AccountRequestNotificationTarget = {
  _id: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export type Notification = {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedRequest?: Pick<FinancialRequest, '_id' | 'requestId' | 'status' | 'currentAssignedRole'>;
  relatedAccountRequest?: AccountRequestNotificationTarget | string;
  createdAt: string;
};
