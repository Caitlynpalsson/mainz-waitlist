import { Text, View } from 'react-native';
import { PICKUP_WORKS_LINE, WHY_MAINZ_LINES, farmPortrait, storyLines } from '../../../api/src/listing';
import { colors } from '../theme';
import { FoodImage } from './ui';

export function FarmBelow({ story, photo, hero, width }: { story: string; photo?: string | null; hero?: string | null; width: number }) {
  const lines = storyLines(story);
  const portrait = farmPortrait(photo, hero);
  const size = Math.min(200, Math.max(140, width - 120));
  return (
    <View style={{ marginTop: 64, gap: 56, alignItems: 'center', paddingHorizontal: 8 }}>
      <View style={{ alignItems: 'center', width: '100%', maxWidth: 420 }}>
        <Text style={heading}>meet the farm</Text>
        {portrait ? (
          <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', marginTop: 22, backgroundColor: colors.cream }}>
            <FoodImage photo={portrait} name="" width={size} height={size} />
          </View>
        ) : null}
        {lines.map((line) => (
          <Text key={line} style={body}>{line}</Text>
        ))}
      </View>
      <View style={{ alignItems: 'center', width: '100%', maxWidth: 420 }}>
        <Text style={heading}>how pickup works</Text>
        <Text style={body}>{PICKUP_WORKS_LINE}</Text>
      </View>
      <View style={{ alignItems: 'center', width: '100%', maxWidth: 420 }}>
        <Text style={heading}>why mainz</Text>
        {WHY_MAINZ_LINES.map((line) => (
          <Text key={line} style={body}>{line}</Text>
        ))}
      </View>
    </View>
  );
}

const heading = { fontFamily: 'Inter' as const, fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.4, color: colors.navy, textAlign: 'center' as const };
const body = { fontFamily: 'Inter' as const, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center' as const, marginTop: 10 };
