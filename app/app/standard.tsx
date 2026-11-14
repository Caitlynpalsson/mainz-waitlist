import { Text, View } from 'react-native';
import { Shell } from '../src/components/chrome';
import { Cap, Wrap } from '../src/components/ui';
import { colors, useLayout } from '../src/theme';

const checks = [
  ['01', 'quality', 'how it looks, how it holds up, and what buyers say.'],
  ['02', 'transparency', 'where it comes from and how it is grown or raised.'],
  ['03', 'food safety', 'the right licenses, permits and handling.'],
  ['04', 'accessibility', 'clear prices and real value for your money.'],
  ['05', 'reliability', 'what is listed is in stock. orders show up.'],
];

export default function Standard() {
  const { desktop } = useLayout();
  return (
    <Shell nav="standard" top="bar" title="the standard">
      <Wrap style={{ paddingTop: desktop ? 72 : 20 }}>
        <View style={{ alignItems: 'center' }}>
          <Cap>the mainz standard</Cap>
          <Text style={lede}>five things we check before a farm goes live.</Text>
        </View>
        <View style={{ marginTop: 36, borderTopWidth: 1, borderTopColor: colors.navy }}>
          {checks.map(([n, title, body]) => (
            <View key={n} style={{ paddingVertical: 28, borderBottomWidth: 1, borderBottomColor: colors.hair }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 11, letterSpacing: 2, color: colors.gray }}>{n}</Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: colors.navy, marginTop: 10 }}>{title}</Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.gray, marginTop: 8, lineHeight: 22 }}>{body}</Text>
            </View>
          ))}
        </View>
        <Text style={[lede, { fontSize: 13, color: colors.gray, marginTop: 28 }]}>
          how we check: documentation, conversations, samples and customer feedback. we keep checking after a farm is live.
        </Text>
      </Wrap>
    </Shell>
  );
}

const lede = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, textAlign: 'center' as const, marginTop: 16, lineHeight: 24 };
