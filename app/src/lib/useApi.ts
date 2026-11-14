import { useEffect, useState } from 'react';
import { api } from './api';

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  useEffect(() => {
    if (!path) return undefined;
    let cancel = false;
    setLoading(true);
    api<T>(path)
      .then((next) => {
        if (!cancel) {
          setData(next);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancel) setError(err.message);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [path]);

  return { data, error, loading };
}
