import { Text, View } from 'react-native';
import { WHY_MAINZ_LINES, farmPortrait, howPickupWorks, meetTheFarmLines, portraitIsLogo } from '../../../api/src/listing';
import { colors } from '../theme';
import { FoodImage } from './ui';

export const FARM_THANKS = "thank you for feeding utah. we're so glad you're here.";

export function FarmBelow({
  story,
  alreadyShown,
  meetLine,
  pickupLine,
  town,
  grows,
  sinceYear,
  photo,
  hero,
  width,
}: {
  story: string;
  alreadyShown?: string;
  meetLine?: string;
  pickupLine?: string;
  town?: string;
  grows?: string[];
  sinceYear?: number | null;
  photo?: string | null;
  hero?: string | null;
  width: number;
}) {
  const lines = meetTheFarmLines({ story, alreadyShown: alreadyShown ?? story, meetLine, town, grows, sinceYear });
  const portrait = farmPortrait(photo, hero);
  const logo = portraitIsLogo(portrait);
  const size = logo ? 72 : Math.min(200, Math.max(140, width - 120));
  return (
    <View style={{ marginTop: 64, gap: 56, alignItems: 'center', paddingHorizontal: 8 }}>
      {portrait || lines.length ? (
        <View style={{ alignItems: 'center', width: '100%', maxWidth: 420 }}>
          <Text style={heading}>meet the farm</Text>
          {portrait ? (
            <View style={{ width: size, height: size, borderRadius: logo ? 16 : size / 2, overflow: 'hidden', marginTop: 22, backgroundColor: colors.cream }}>
              <FoodImage photo={portrait} name="" width={size} height={size} />
            </View>
          ) : null}
          {lines.map((line) => (
            <Text key={line} style={body}>{line}</Text>
          ))}
        </View>
      ) : null}
      <View style={{ alignItems: 'center', width: '100%', maxWidth: 420 }}>
        <Text style={heading}>how pickup works</Text>
        <Text style={body}>{howPickupWorks(pickupLine)}</Text>
      </View>
      <View style={{ alignItems: 'center', width: '100%', maxWidth: 420 }}>
        <Text style={heading}>why the main course</Text>
        {WHY_MAINZ_LINES.map((line) => (
          <Text key={line} style={body}>{line}</Text>
        ))}
      </View>
      <Text style={thanks}>{FARM_THANKS}</Text>
    </View>
  );
}

const heading = { fontFamily: 'Inter' as const, fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.4, color: colors.navy, textAlign: 'center' as const };
const body = { fontFamily: 'Inter' as const, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center' as const, marginTop: 10 };
const thanks = { fontFamily: 'Inter' as const, fontSize: 14, lineHeight: 21, color: colors.gray, textAlign: 'center' as const, marginTop: 8 };
