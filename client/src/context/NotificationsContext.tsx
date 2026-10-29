import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiRequestError } from '../api/apiClient';
import { notificationApi } from '../api/notificationApi';
import { useAuth } from '../hooks/useAuth';
import { NotificationsContext, notificationsChangedEvent } from '../hooks/useNotifications';
import type { Notification } from '../types/notification';

const pollMs = 30000;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    setNotifications([]);
    setIsLoading(false);
    if (!token) return;

    let disposed = false;
    let inFlight = false;
    let refreshPending = false;
    let timer: number | undefined;
    let retryAt = 0;
    let failures = 0;
    const controller = new AbortController();

    async function fetchNotifications() {
      if (disposed || document.hidden) return;
      if (inFlight) {
        refreshPending = true;
        return;
      }
      if (Date.now() < retryAt) return;
      window.clearTimeout(timer);
      inFlight = true;
      setIsLoading(true);
      let delay = pollMs;
      try {
        const items = await notificationApi.list(controller.signal);
        if (!disposed) setNotifications(items);
        failures = 0;
      } catch (error) {
        // Keep the last successful count and back off instead of retrying continuously.
        failures += 1;
        delay = Math.max(
          Math.min(pollMs * 2 ** failures, 5 * 60 * 1000),
          error instanceof ApiRequestError ? error.retryAfterMs : 0
        );
        retryAt = Date.now() + delay;
      } finally {
        inFlight = false;
        if (!disposed) {
          setIsLoading(false);
          timer = window.setTimeout(() => void fetchNotifications(), refreshPending && !failures ? 0 : delay);
          refreshPending = false;
        }
      }
    }

    refreshRef.current = fetchNotifications;
    const onRefresh = () => void fetchNotifications();
    // Defer startup so React StrictMode's setup/cleanup cycle does not duplicate requests.
    timer = window.setTimeout(onRefresh, 0);
    window.addEventListener(notificationsChangedEvent, onRefresh);
    document.addEventListener('visibilitychange', onRefresh);
    return () => {
      disposed = true;
      controller.abort();
      window.clearTimeout(timer);
      refreshRef.current = async () => {};
      window.removeEventListener(notificationsChangedEvent, onRefresh);
      document.removeEventListener('visibilitychange', onRefresh);
    };
  }, [token]);

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
    isLoading,
    refresh
  }), [notifications, isLoading, refresh]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
