import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../theme';

export function Logo({ size = 12, onPress = true }: { size?: number; onPress?: boolean }) {
  const scale = size / 12;
  const body = (
    <View style={{ paddingLeft: 4.8 * scale, alignSelf: 'flex-start', position: 'relative' }}>
      <Text style={mark(size)}>{'LOVE\nLIVING:'}</Text>
      <Text style={[mark(size), { paddingLeft: 17.2 * scale, marginTop: 0.8 * scale }]}>AINZ</Text>
      <Text
        style={{
          position: 'absolute',
          fontFamily: 'Scr',
          fontSize: 20.8 * scale,
          lineHeight: 22 * scale,
          left: -4 * scale,
          bottom: -2.4 * scale,
          color: colors.black,
        }}
      >
        M
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel="mainz" onPress={() => router.push('/')}>
      {body}
    </Pressable>
  );
}

function mark(size: number) {
  return {
    fontFamily: 'Inter' as const,
    fontWeight: '800' as const,
    fontSize: size,
    letterSpacing: size * -0.05,
    lineHeight: size * 0.95,
    color: colors.navy,
  };
}
