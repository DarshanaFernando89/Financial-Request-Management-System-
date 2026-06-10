import { apiClient } from './apiClient';
import type { User } from '../types/auth';

export const userApi = {
  async list(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<{ items: User[]; total: number; page: number; pages: number }>('/users', { params });
    return data;
  },
  async get(id: string) {
    const { data } = await apiClient.get<User>(`/users/${id}`);
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await apiClient.post<User>('/users', payload);
    return data;
  },
  async update(id: string, payload: Record<string, unknown>) {
    const { data } = await apiClient.put<User>(`/users/${id}`, payload);
    return data;
  },
  async activate(id: string) {
    const { data } = await apiClient.patch<User>(`/users/${id}/activate`);
    return data;
  },
  async deactivate(id: string) {
    const { data } = await apiClient.patch<User>(`/users/${id}/deactivate`);
    return data;
  },
  async resetPassword(id: string, password = 'Password123!') {
    const { data } = await apiClient.patch<{ message: string }>(`/users/${id}/reset-password`, { password });
    return data;
  },
  async profile() {
    const { data } = await apiClient.get<User>('/users/me/profile');
    return data;
  },
  async updateProfile(payload: Record<string, unknown>) {
    const { data } = await apiClient.put<User>('/users/me/profile', payload);
    return data;
  }
};
