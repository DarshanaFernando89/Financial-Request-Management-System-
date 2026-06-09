import { apiClient } from './apiClient';
import type { SummaryReport } from '../types/report';

export const reportApi = {
  async summary(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<SummaryReport>('/reports/summary', { params });
    return data;
  },
  async claimsPerUser(params?: Record<string, unknown>) {
    const { data } = await apiClient.get('/reports/claims-per-user', { params });
    return data.items;
  },
  async monthlySummary(params?: Record<string, unknown>) {
    const { data } = await apiClient.get('/reports/monthly-summary', { params });
    return data.items;
  },
  exportUrl(type: 'pdf' | 'excel') {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    return `${base}/reports/export/${type}`;
  }
};
