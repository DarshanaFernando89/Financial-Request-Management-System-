import { apiClient } from './apiClient';
import type { Payment } from '../types/finance';
import type { FinancialRequest } from '../types/request';

export const financeApi = {
  async pendingPayments() {
    const { data } = await apiClient.get<{ items: FinancialRequest[] }>('/finance/pending-payments');
    return data.items;
  },
  async paymentHistory() {
    const { data } = await apiClient.get<{ items: Payment[] }>('/finance/payment-history');
    return data.items;
  },
  async get(id: string) {
    const { data } = await apiClient.get<FinancialRequest>(`/finance/${id}`);
    return data;
  },
  async markPaid(id: string, payload: Record<string, unknown>) {
    const { data } = await apiClient.post<{ request: FinancialRequest; payment: Payment }>(`/finance/${id}/mark-paid`, payload);
    return data;
  },
  async requestInfo(id: string, remarks: string) {
    const { data } = await apiClient.post<FinancialRequest>(`/finance/${id}/request-info`, { remarks });
    return data;
  },
  async reject(id: string, remarks: string) {
    const { data } = await apiClient.post<FinancialRequest>(`/finance/${id}/reject`, { remarks });
    return data;
  }
};
