import { useEffect, useState } from 'react';

// Pass a stable API method so rerenders do not restart the request.
export function useDashboardData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    load().then((result) => {
      if (!cancelled) setData(result);
    }).catch(() => {
      if (!cancelled) setError('Unable to load your dashboard. Please try again.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [load, attempt]);

  return { data, loading, error, retry: () => setAttempt((value) => value + 1) };
}
