import type { FinancialRequest } from './request';

export type SummaryReport = {
  statusCounts: { _id: string; count: number }[];
  typeCounts: { _id: string; count: number; amount: number }[];
  totalAmount: { amount: number; count: number };
  recentRequests: FinancialRequest[];
};
