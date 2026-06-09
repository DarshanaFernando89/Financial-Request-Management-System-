import { apiClient } from './apiClient';
import type { AuditLog } from '../types/audit';

export const auditApi = {
  async list(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<{ items: AuditLog[] }>('/audit-logs', { params });
    return data.items;
  }
};
