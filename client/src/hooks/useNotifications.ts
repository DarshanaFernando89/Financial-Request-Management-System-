import { useEffect, useState } from 'react';
import { notificationApi } from '../api/notificationApi';
import type { Notification } from '../types/notification';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function refresh() {
    setIsLoading(true);
    try {
      setNotifications(await notificationApi.list());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
    isLoading,
    refresh
  };
}
