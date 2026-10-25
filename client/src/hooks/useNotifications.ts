import { createContext, useContext } from 'react';
import type { Notification } from '../types/notification';

export const notificationsChangedEvent = 'frms:notifications-changed';

export const NotificationsContext = createContext<{
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
} | undefined>(undefined);

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(notificationsChangedEvent));
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationsProvider.');
  return context;
}
