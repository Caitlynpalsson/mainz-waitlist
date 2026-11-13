import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Shell } from '../src/components/chrome';
import { Cap, PrimaryButton, Wrap } from '../src/components/ui';
import { colors, useLayout } from '../src/theme';

const terms = [
  'you set your products and your prices.',
  'you choose pickup, delivery or both.',
  'you pick a food from our catalog. the stock photo fills in. your own photo can replace it if it is sharp enough.',
  'we help you find customers.',
  'we make money from a small transaction fee, plus a delivery fee on delivery orders. that is it.',
];

export default function ForFarmers() {
  const { desktop } = useLayout();
  return (
    <Shell nav="farmers" top="bar" title="for farmers">
      <Wrap style={{ paddingTop: desktop ? 72 : 20 }}>
        <View style={{ alignItems: 'center', maxWidth: 560, alignSelf: 'center' }}>
          <Cap>for farmers</Cap>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: colors.navy, marginTop: 14, textAlign: 'center' }}>
            you grow it. we bring you the customers.
          </Text>
        </View>
        <View style={{ marginTop: 32, borderTopWidth: 1, borderTopColor: colors.navy, maxWidth: 640, alignSelf: 'center', width: '100%' }}>
          {terms.map((term, index) => (
            <View key={term} style={{ flexDirection: 'row', gap: 16, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.hair }}>
              <Text style={{ fontFamily: 'Inter', color: colors.peri, width: 28 }}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.navy, flex: 1, lineHeight: 22 }}>{term}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.gray, textAlign: 'center', marginTop: 22, maxWidth: 460, alignSelf: 'center' }}>
          every farm is reviewed before it goes live. launch is a handful of invite-only farms.
        </Text>
        <View style={{ marginTop: 28, maxWidth: 320, alignSelf: 'center', width: '100%' }}>
          <PrimaryButton label="apply to sell on mainz" onPress={() => router.push('/apply')} />
        </View>
      </Wrap>
    </Shell>
  );
}
