import { useEffect, useState } from 'react';

// Pass a stable API method so rerenders do not restart the request.
export function useDashboardData<T>(load: () => Promise<T>, refreshIntervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let retryAfter = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    setError('');
    async function refresh() {
      if (cancelled || inFlight || Date.now() < retryAfter) return;
      inFlight = true;
      if (timer) clearTimeout(timer);
      try {
        const result = await load();
        if (!cancelled) {
          setData(result);
          setError('');
        }
      } catch (failure) {
        const wait = Number((failure as { retryAfterMs?: number })?.retryAfterMs) || 0;
        retryAfter = Date.now() + wait;
        if (!cancelled) setError(failure instanceof Error ? failure.message : 'Unable to load requests. Please try again.');
      } finally {
        inFlight = false;
        if (!cancelled) {
          setLoading(false);
          if (refreshIntervalMs > 0) {
            timer = setTimeout(() => {
              if (document.visibilityState === 'visible') void refresh();
            }, Math.max(refreshIntervalMs, retryAfter - Date.now()));
          }
        }
      }
    }
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    void refresh();
    if (refreshIntervalMs > 0) {
      window.addEventListener('focus', refreshVisible);
      document.addEventListener('visibilitychange', refreshVisible);
    }
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [load, attempt, refreshIntervalMs]);

  return { data, loading, error, retry: () => setAttempt((value) => value + 1) };
}
