import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Shell } from '../src/components/chrome';
import { Cap, Hair, Wrap } from '../src/components/ui';
import { colors, useLayout } from '../src/theme';

const links = [
  ['apply as a farm', '/apply'],
  ['farm dashboard', '/dashboard'],
  ['the mainz standard', '/standard'],
  ['for farmers', '/for-farmers'],
  ['help', '/help'],
  ['admin', '/admin'],
] as const;

export default function You() {
  const { desktop } = useLayout();
  return (
    <Shell nav={null} tab="you" showTabs top="bar" title="you">
      <Wrap style={{ paddingTop: desktop ? 64 : 16 }}>
        <View style={{ maxWidth: 460, alignSelf: 'center', width: '100%' }}>
          <Cap>you</Cap>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: colors.navy, marginTop: 12 }}>
            accounts come later. these are the doors that work now.
          </Text>
          <View style={{ marginTop: 28 }}>
            {links.map(([label, href]) => (
              <Pressable key={href} onPress={() => router.push(href)} style={{ paddingVertical: 16 }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.navy }}>{label}</Text>
                <View style={{ marginTop: 16 }}><Hair /></View>
              </Pressable>
            ))}
          </View>
        </View>
      </Wrap>
    </Shell>
  );
}
