import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../theme';

// Temporary wordmark until a logo file is supplied.
// Inter, navy, lowercase. Not an image.
export function Logo({ size = 18, onPress = true }: { size?: number; onPress?: boolean }) {
  const body = (
    <Text
      style={{
        fontFamily: 'Inter',
        fontWeight: '600',
        fontSize: size,
        lineHeight: size + 4,
        letterSpacing: -0.4,
        color: colors.navy,
      }}
    >
      the main course
    </Text>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel="the main course" onPress={() => router.push('/')} hitSlop={8}>
      {body}
    </Pressable>
  );
}
