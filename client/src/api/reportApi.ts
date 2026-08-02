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
  async exportFile(type: 'pdf' | 'excel', params?: Record<string, unknown>) {
    const response = await apiClient.get(`/reports/export/${type}`, {
      params,
      responseType: 'blob'
    });

    const contentType = typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : 'application/octet-stream';
    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-request-report.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  exportUrl(type: 'pdf' | 'excel') {
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    return `${base}/reports/export/${type}`;
  }
};
