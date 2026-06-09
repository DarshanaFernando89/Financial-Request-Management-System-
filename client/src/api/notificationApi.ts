import { apiClient } from './apiClient';
import type { Notification } from '../types/notification';

export const notificationApi = {
  async list() {
    const { data } = await apiClient.get<{ items: Notification[] }>('/notifications');
    return data.items;
  },
  async get(id: string) {
    const { data } = await apiClient.get<Notification>(`/notifications/${id}`);
    return data;
  },
  async read(id: string) {
    const { data } = await apiClient.patch<Notification>(`/notifications/${id}/read`);
    return data;
  },
  async readAll() {
    const { data } = await apiClient.patch('/notifications/read-all');
    return data;
  }
};
