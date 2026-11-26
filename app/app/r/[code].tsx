import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/components/chrome';
import { PrimaryButton, Wrap } from '../../src/components/ui';
import { REP_CODE_KEY } from '../../../api/src/reps';
import { colors, useLayout } from '../../src/theme';

export default function RepRedirect() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { desktop } = useLayout();
  const [ready, setReady] = useState('');

  useEffect(() => {
    const clean = String(code || '').trim().toLowerCase();
    if (!/^[a-z0-9]{4,12}$/.test(clean)) return;
    try { localStorage.setItem(REP_CODE_KEY, clean); } catch { /* apply and you still read ?rep= */ }
    setReady(clean);
  }, [code]);

  return (
    <Shell top="bar" title="you're invited">
      <Wrap style={{ paddingTop: desktop ? 64 : 28 }}>
        <View style={{ maxWidth: 420, alignSelf: 'center', width: '100%', alignItems: 'center' }}>
          <Text style={headline}>a friend sent you.</Text>
          <Text style={body}>farms apply. shoppers hop on the list. same link, two doors.</Text>
          {ready ? (
            <>
              <View style={{ marginTop: 28, width: '100%' }}>
                <PrimaryButton label="i'm a farm" onPress={() => router.push(`/apply?rep=${ready}`)} />
              </View>
              <View style={{ marginTop: 12, width: '100%' }}>
                <PrimaryButton label="i shop" onPress={() => router.push(`/you?rep=${ready}`)} />
              </View>
            </>
          ) : <Text style={body}>that link is not right.</Text>}
        </View>
      </Wrap>
    </Shell>
  );
}

const headline = { fontFamily: 'Inter' as const, fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.6, color: colors.navy, textAlign: 'center' as const };
const body = { fontFamily: 'Inter' as const, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center' as const, marginTop: 12 };
