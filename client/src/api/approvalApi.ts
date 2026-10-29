import { apiClient } from './apiClient';
import { notifyNotificationsChanged } from '../hooks/useNotifications';
import type { FinancialRequest } from '../types/request';

export const approvalApi = {
  async pending() {
    const { data } = await apiClient.get<{ items: FinancialRequest[] }>('/approvals/pending');
    return data.items;
  },
  async history() {
    const { data } = await apiClient.get<{ items: FinancialRequest[] }>('/approvals/history');
    return data.items;
  },
  async approve(id: string, remarks: string) {
    const { data } = await apiClient.post<FinancialRequest>(`/approvals/${id}/approve`, { remarks });
    notifyNotificationsChanged();
    return data;
  },
  async verifyForward(id: string, remarks: string) {
    const { data } = await apiClient.post<FinancialRequest>(`/approvals/${id}/verify-forward`, { remarks });
    notifyNotificationsChanged();
    return data;
  },
  async requestInfo(id: string, remarks: string) {
    const { data } = await apiClient.post<FinancialRequest>(`/approvals/${id}/request-info`, { remarks });
    notifyNotificationsChanged();
    return data;
  },
  async reject(id: string, remarks: string) {
    const { data } = await apiClient.post<FinancialRequest>(`/approvals/${id}/reject`, { remarks });
    notifyNotificationsChanged();
    return data;
  }
};
