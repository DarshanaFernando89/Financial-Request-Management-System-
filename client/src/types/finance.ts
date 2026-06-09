import type { FinancialRequest } from './request';

export type Payment = {
  _id: string;
  request: FinancialRequest;
  amount: number;
  paidAt: string;
  referenceNo: string;
  remarks?: string;
};
