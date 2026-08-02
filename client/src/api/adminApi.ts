import { apiClient } from './apiClient';
import type { ApprovalRule } from '../types/rule';
import type { RequestType } from '../types/request';

export const adminApi = {
  async dashboard() {
    const { data } = await apiClient.get('/admin/dashboard');
    return data;
  },
  async roles() {
    const { data } = await apiClient.get('/admin/roles');
    return data.items as Array<{
      _id: string;
      code: string;
      displayName: string;
      description?: string;
      isActive: boolean;
      isSystem?: boolean;
    }>;
  },
  async createRole(payload: Record<string, unknown>) {
    const { data } = await apiClient.post('/admin/roles', payload);
    return data;
  },
  async updateRole(id: string, payload: Record<string, unknown>) {
    const { data } = await apiClient.put(`/admin/roles/${id}`, payload);
    return data;
  },
  async deleteRole(id: string) {
    const { data } = await apiClient.delete(`/admin/roles/${id}`);
    return data;
  },
  async rules() {
    const { data } = await apiClient.get<{ items: ApprovalRule[] }>('/admin/approval-rules');
    return data.items;
  },
  async createRule(payload: Record<string, unknown>) {
    const { data } = await apiClient.post<ApprovalRule>('/admin/approval-rules', payload);
    return data;
  },
  async updateRule(id: string, payload: Record<string, unknown>) {
    const { data } = await apiClient.put<ApprovalRule>(`/admin/approval-rules/${id}`, payload);
    return data;
  },
  async deleteRule(id: string) {
    const { data } = await apiClient.delete(`/admin/approval-rules/${id}`);
    return data;
  },
  async requestTypes() {
    const { data } = await apiClient.get<{ items: RequestType[] }>('/admin/request-types');
    return data.items;
  },
  async createRequestType(payload: Record<string, unknown>) {
    const { data } = await apiClient.post<RequestType>('/admin/request-types', payload);
    return data;
  },
  async updateRequestType(id: string, payload: Record<string, unknown>) {
    const { data } = await apiClient.put<RequestType>(`/admin/request-types/${id}`, payload);
    return data;
  },
  async accountRequests() {
    const { data } = await apiClient.get('/account-requests');
    return data.items;
  },
  async approveAccountRequest(id: string, payload: Record<string, unknown>) {
    const { data } = await apiClient.patch(`/account-requests/${id}/approve`, payload);
    return data;
  },
  async rejectAccountRequest(id: string, adminRemarks: string) {
    const { data } = await apiClient.patch(`/account-requests/${id}/reject`, { adminRemarks });
    return data;
  }
};
