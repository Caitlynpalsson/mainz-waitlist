import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Shell } from '../src/components/chrome';
import { PrimaryButton, Wrap } from '../src/components/ui';
import { colors, useLayout } from '../src/theme';

const steps = [
  'you set your products and your prices.',
  'you choose pickup, delivery or both.',
  'you pick a food. we add a photo.',
  'we help you find customers.',
  'a small transaction fee, plus a delivery fee on delivery orders.',
];

export default function ForFarmers() {
  const { desktop } = useLayout();
  return (
    <Shell nav="farmers" top="bar" title="for farmers">
      <Wrap style={{ paddingTop: desktop ? 72 : 28 }}>
        <View style={{ alignItems: 'center', maxWidth: 420, alignSelf: 'center', width: '100%' }}>
          <Text style={headline}>you grow it.{'\n'}we bring you the customers.</Text>
          <View style={{ marginTop: desktop ? 64 : 48, width: '100%' }}>
            {steps.map((step, index) => (
              <View key={step} style={{ alignItems: 'center', marginBottom: desktop ? 40 : 32 }}>
                <Text style={num}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={stepText}>{step}</Text>
              </View>
            ))}
          </View>
          <Text style={[quiet, { marginTop: desktop ? 28 : 16 }]}>every farm is reviewed before it goes live.</Text>
          <Text style={[quiet, { marginTop: 8 }]}>founding farms get the sign-up fee waived.</Text>
          <View style={{ marginTop: 22, width: '100%', maxWidth: 320 }}>
            <PrimaryButton label="apply to sell on mainz" onPress={() => router.push('/apply')} />
          </View>
        </View>
      </Wrap>
    </Shell>
  );
}

const headline = {
  fontFamily: 'Inter' as const,
  fontSize: 28,
  fontWeight: '600' as const,
  letterSpacing: -0.6,
  lineHeight: 34,
  color: colors.navy,
  textAlign: 'center' as const,
};
const num = {
  fontFamily: 'Inter' as const,
  fontSize: 12,
  fontWeight: '500' as const,
  color: colors.peri,
  marginBottom: 8,
};
const stepText = {
  fontFamily: 'Inter' as const,
  fontSize: 16,
  lineHeight: 22,
  color: colors.navy,
  textAlign: 'center' as const,
};
const quiet = {
  fontFamily: 'Inter' as const,
  fontSize: 13,
  lineHeight: 18,
  color: colors.gray,
  textAlign: 'center' as const,
};
