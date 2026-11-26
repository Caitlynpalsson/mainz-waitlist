import { useEffect } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { REP_CODE_KEY } from '../../../api/src/reps';
import { colors } from '../../src/theme';

export default function RepRedirect() {
  const { code } = useLocalSearchParams<{ code: string }>();
  useEffect(() => {
    const clean = String(code || '').trim().toLowerCase();
    if (!/^[a-z0-9]{4,12}$/.test(clean)) return;
    try {
      localStorage.setItem(REP_CODE_KEY, clean);
    } catch {
      // the apply page still reads ?rep=
    }
    router.replace(`/apply?rep=${clean}`);
  }, [code]);
  return <Text style={{ fontFamily: 'Inter', color: colors.gray, textAlign: 'center', marginTop: 48 }}>one moment.</Text>;
}
