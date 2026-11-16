import { Text, View } from 'react-native';
import { Shell } from '../src/components/chrome';
import { PrimaryButton, Wrap } from '../src/components/ui';
import { colors } from '../src/theme';
import { router } from 'expo-router';

export default function NotFound() {
  return (
    <Shell top="bar" title="mainz">
      <Wrap style={{ paddingTop: 80, alignItems: 'center' }}>
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: colors.navy }}>that page is not here.</Text>
          <PrimaryButton label="back to browse" onPress={() => router.replace('/')} />
        </View>
      </Wrap>
    </Shell>
  );
}
