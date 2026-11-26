import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const TOKEN_KEY = 'mainz.adminToken';

export function useAdminToken() {
  const [token, setToken] = useState('');
  const [draft, setDraft] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then((saved) => {
        if (saved) {
          setToken(saved);
          setDraft(saved);
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  async function save() {
    const next = draft.trim();
    await AsyncStorage.setItem(TOKEN_KEY, next);
    setToken(next);
    return next;
  }

  return { token, draft, setDraft, ready, save };
}

export function adminHeaders(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}
