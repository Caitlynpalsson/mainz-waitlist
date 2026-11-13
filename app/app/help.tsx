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
            this preview does not take payment. questions go to instagram for now.
          </Text>
          <Pressable onPress={() => Linking.openURL('https://instagram.com/themainzco')} style={{ marginTop: 18 }}>
            <Text style={{ fontFamily: 'Inter', color: colors.navy, fontWeight: '600' }}>@themainzco</Text>
          </Pressable>
        </View>
      </Wrap>
    </Shell>
  );
}
