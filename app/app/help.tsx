import { Linking, Pressable, Text, View } from 'react-native';
import { Shell } from '../src/components/chrome';
import { Cap, Wrap } from '../src/components/ui';
import { colors, useLayout } from '../src/theme';

export default function Help() {
  const { desktop } = useLayout();
  return (
    <Shell top="bar" title="help">
      <Wrap style={{ paddingTop: desktop ? 72 : 24 }}>
        <View style={{ alignItems: 'center', maxWidth: 420, alignSelf: 'center' }}>
          <Cap>help</Cap>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, color: colors.navy, textAlign: 'center', marginTop: 16, lineHeight: 24 }}>
            questions? find us on instagram.
          </Text>
          <Pressable onPress={() => Linking.openURL('https://instagram.com/themainzco')} hitSlop={8} style={{ marginTop: 18, minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Inter', color: colors.navy, fontWeight: '600' }}>@themainzco</Text>
          </Pressable>
        </View>
      </Wrap>
    </Shell>
  );
}
