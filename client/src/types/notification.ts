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
  relatedRequest?: FinancialRequest;
  relatedAccountRequest?: AccountRequestNotificationTarget | string;
  createdAt: string;
};
