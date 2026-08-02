import { useEffect, useState } from 'react';
import { notificationApi } from '../api/notificationApi';
import type { Notification } from '../types/notification';

const notificationsChangedEvent = 'frms:notifications-changed';

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(notificationsChangedEvent));
}

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
    const handleNotificationsChanged = () => void refresh();
    window.addEventListener(notificationsChangedEvent, handleNotificationsChanged);
    const interval = pollMs ? window.setInterval(() => {
      void refresh();
    }, pollMs) : undefined;
    return () => {
      if (interval) window.clearInterval(interval);
      window.removeEventListener(notificationsChangedEvent, handleNotificationsChanged);
    };
  }, [pollMs]);

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
    isLoading,
    refresh
  };
}
