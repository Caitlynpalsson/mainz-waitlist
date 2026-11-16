import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../../src/lib/api';
import { STAFF_LINK_EXPIRED } from '../../../../api/src/staffPreview';
import { colors } from '../../../src/theme';

export default function StaffGo() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [message, setMessage] = useState('one moment.');

  useEffect(() => {
    if (!code) {
      setMessage(STAFF_LINK_EXPIRED);
      return undefined;
    }
    let cancel = false;
    api<{ shopperPath: string; session: string }>('/api/staff-preview/redeem', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ code }),
    })
      .then((next) => {
        if (cancel) return;
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('mainz.staffSession', next.session);
        router.replace(next.shopperPath);
      })
      .catch(() => {
        if (!cancel) setMessage(STAFF_LINK_EXPIRED);
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
