import { apiClient } from './apiClient';
import type { LoginResponse, Role, User } from '../types/auth';

export const authApi = {
  async login(email: string, password: string) {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },
  async selectRole(role: Role, approvalRolePassword?: string) {
    const { data } = await apiClient.post<{ token: string; user: User }>('/auth/select-role', { role, approvalRolePassword });
    return data;
  },
  async me() {
    const { data } = await apiClient.get<{ user: User }>('/auth/me');
    return data.user;
  },
  async logout() {
    await apiClient.post('/auth/logout');
  },
  async forgotPassword(email: string) {
    const { data } = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
    return data;
  },
  async requestAccount(payload: Record<string, unknown>) {
    const { data } = await apiClient.post('/auth/request-account', payload);
    return data;
  }
};
