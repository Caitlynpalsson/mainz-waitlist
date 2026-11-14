import { Pressable, Text, View, type TextStyle } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../theme';

// Lockup: LOVE / LIVING: on their own lines, then the script M as the M in MAINZ.
// The M is in the row with AINZ so it is not absolutely positioned over the words above.
export function Logo({ size = 12, onPress = true }: { size?: number; onPress?: boolean }) {
  const s = size;
  const script = s * 1.85;
  const caps: TextStyle = {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: s,
    lineHeight: s,
    letterSpacing: s * -0.04,
    color: colors.navy,
  };
  const body = (
    <View style={{ alignSelf: 'flex-start' }}>
      <Text style={[caps, { marginLeft: s * 0.15 }]}>LOVE</Text>
      <Text style={[caps, { marginLeft: s * 0.15 }]}>LIVING:</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: s * 0.02 }}>
        <Text
          style={{
            fontFamily: 'Scr',
            fontSize: script,
            lineHeight: script,
            color: '#111111',
          }}
        >
          M
        </Text>
        <Text style={[caps, { marginLeft: -s * 0.55, marginBottom: s * 0.12 }]}>AINZ</Text>
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel="mainz" onPress={() => router.push('/')}>
      {body}
    </Pressable>
  );
}
