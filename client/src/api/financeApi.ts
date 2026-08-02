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
  },
  async downloadPaymentReceipt(id: string) {
    const response = await apiClient.get(`/finance/${id}/payment-receipt`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-receipt-${id}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  },
  async printPaymentReceipt(id: string) {
    const response = await apiClient.get(`/finance/${id}/payment-receipt`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  }
};
