import { useEffect, useState } from 'react';
import { notificationApi } from '../api/notificationApi';
import type { Notification } from '../types/notification';

export function useNotifications(pollMs = 10000) {
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
    if (!pollMs) return undefined;
    const interval = window.setInterval(() => {
      void refresh();
    }, pollMs);
    return () => window.clearInterval(interval);
  }, [pollMs]);

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
    isLoading,
    refresh
  };
}
