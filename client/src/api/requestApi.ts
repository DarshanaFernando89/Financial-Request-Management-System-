import { apiClient } from './apiClient';
import { notifyNotificationsChanged } from '../hooks/useNotifications';
import type { FinancialRequest, RequestListResponse, RequestType } from '../types/request';
import type { RequestRuleOption } from '../types/rule';
import type { DocumentPolicy } from '../utils/documentPolicy';

export const requestApi = {
  async rules() {
    const { data } = await apiClient.get<{ items: RequestRuleOption[] }>('/requests/rules/active');
    return data.items;
  },
  async types() {
    const { data } = await apiClient.get<{ items: RequestType[] }>('/requests/types/active');
    return data.items;
  },
  async duplicateFuelWarning(requestType: string, amount: number, travelDate: string) {
    const { data } = await apiClient.get<{
      warning?: string;
      duplicateRequestId?: string;
      duplicateRequestReference?: string;
    }>('/requests/duplicate-fuel-warning', {
      params: { requestType, amount, travelDate }
    });
    return data;
  },
  async list(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<RequestListResponse>('/requests', { params });
    return data;
  },
  async mine(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<RequestListResponse>('/requests/my', { params });
    return data.items;
  },
  async get(id: string) {
    const { data } = await apiClient.get<FinancialRequest>(`/requests/${id}`);
    notifyNotificationsChanged();
    return data;
  },
  async documentPolicy(id: string) {
    const { data } = await apiClient.get<DocumentPolicy>(`/requests/${id}/document-policy`);
    return data;
  },
  async create(payload: Record<string, unknown> | FormData) {
    const { data } = await apiClient.post<FinancialRequest>('/requests', payload);
    return data;
  },
  async update(id: string, payload: Record<string, unknown>) {
    const { data } = await apiClient.put<FinancialRequest>(`/requests/${id}`, payload);
    return data;
  },
  async submit(id: string) {
    const { data } = await apiClient.post<FinancialRequest>(`/requests/${id}/submit`);
    return data;
  },
  async resubmit(id: string, payload: Record<string, unknown>) {
    const { data } = await apiClient.post<FinancialRequest>(`/requests/${id}/resubmit`, payload);
    return data;
  },
  async respondClarification(id: string, payload: FormData | Record<string, unknown>) {
    const { data } = await apiClient.post<FinancialRequest>(`/requests/${id}/respond-clarification`, payload);
    return data;
  },
  async uploadDocument(id: string, payload: FormData) {
    const { data } = await apiClient.post(`/requests/${id}/upload-document`, payload);
    return data;
  },
  async cancelDraft(id: string) {
    const { data } = await apiClient.delete<FinancialRequest>(`/requests/${id}/cancel-draft`);
    return data;
  }
};
