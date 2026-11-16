import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../../src/lib/api';
import { staffLinkMessage } from '../../../../api/src/staffPreview';
import { colors } from '../../../src/theme';

export default function StaffGo() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [message, setMessage] = useState('one moment.');

  useEffect(() => {
    if (!code) {
      setMessage(staffLinkMessage(''));
      return undefined;
    }
    let cancel = false;
    api<{ shopperPath: string; session: string }>('/api/staff-preview/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
      .then((next) => {
        if (cancel) return;
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('mainz.staffSession', next.session);
        router.replace(next.shopperPath);
      })
      .catch((err: unknown) => {
        if (!cancel) setMessage(staffLinkMessage(err instanceof Error ? err.message : ''));
      });
    return () => {
      cancel = true;
    };
  }, [code]);

  return (
    <View style={{ flex: 1, minHeight: 480, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 16, lineHeight: 24, color: colors.ink, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}
