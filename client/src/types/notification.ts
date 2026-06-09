import type { FinancialRequest } from './request';

export type Notification = {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedRequest?: FinancialRequest;
  createdAt: string;
};
