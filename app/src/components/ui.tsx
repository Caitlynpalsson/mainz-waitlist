import { useRef, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { colors, useLayout } from '../theme';
import { photoSource } from '../lib/photos';
import { dollars, miles } from '../lib/money';
import type { FarmCard, ProductCard, ProductPhoto } from '../lib/types';
import { IconHeart, IconPin, IconTruck } from './icons';

export function Wrap({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { desktop } = useLayout();
  return (
    <View style={[{ width: '100%', paddingHorizontal: desktop ? 40 : 20 }, style]}>
      <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center' }}>{children}</View>
    </View>
  );
}

export function FoodImage({ photo, name, width, height }: { photo: string; name: string; width: number; height: number }) {
  const source = photoSource(photo);
  if (!source) {
    return (
      <View style={{ width, height, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', padding: 18 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 10, letterSpacing: 2, color: colors.peri, fontWeight: '700' }}>MAINZ</Text>
        <Text style={{ fontFamily: 'Inter', marginTop: 10, fontSize: 16, fontWeight: '600', color: colors.navy, textAlign: 'center' }}>{name}</Text>
        <Text style={{ fontFamily: 'Inter', marginTop: 8, fontSize: 11, color: colors.gray, textAlign: 'center' }}>stock photo coming</Text>
      </View>
    );
  }
  return <Image source={source} style={{ width, height }} resizeMode="cover" accessibilityLabel={name} />;
}

export function ArchGallery({
  photos,
  name,
  width,
  height,
}: {
  photos: ProductPhoto[];
  name: string;
  width: number;
  height: number;
}) {
  const shots = photos.length ? photos : [{ role: 'hero', photo: 'placeholder', isStock: true }];
  const scroller = useRef<{ scrollTo: (opts: { x: number; animated?: boolean }) => void } | null>(null);
  const [index, setIndex] = useState(0);
  return (
    <View style={{ width, alignItems: 'center' }}>
      <View style={{ width, height, borderTopLeftRadius: 9999, borderTopRightRadius: 9999, overflow: 'hidden', backgroundColor: '#111' }}>
        <ScrollView
          ref={scroller as never}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        >
          {shots.map((shot) => (
            <FoodImage key={`${shot.role}-${shot.photo.slice(0, 24)}`} photo={shot.photo} name={name} width={width} height={height} />
          ))}
        </ScrollView>
      </View>
      {shots.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          {shots.map((shot, i) => (
            <Pressable
              key={shot.role + i}
              onPress={() => {
                setIndex(i);
                scroller.current?.scrollTo({ x: i * width, animated: true });
              }}
              accessibilityLabel={`photo ${i + 1}`}
            >
              <View style={{ width: i === index ? 16 : 5, height: 5, borderRadius: 3, backgroundColor: i === index ? colors.navy : '#D5D3CB' }} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function Pill({
  label,
  on,
  onPress,
  cream = false,
  icon,
  small = false,
}: {
  label: string;
  on?: boolean;
  onPress?: () => void;
  cream?: boolean;
  icon?: ReactNode;
  small?: boolean;
}) {
  const style: ViewStyle = {
    height: small ? 26 : 32,
    paddingHorizontal: small ? 10 : 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: on ? colors.navy : cream ? colors.cream : colors.hair,
    backgroundColor: on ? colors.navy : cream ? colors.cream : colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  };
  const text = (
    <Text style={{ fontFamily: 'Inter', fontSize: small ? 10.5 : 12, fontWeight: on ? '600' : '500', color: on ? colors.white : colors.navy }}>
      {label}
    </Text>
  );
  if (!onPress) return <View style={style}>{icon}{text}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, { opacity: pressed ? 0.75 : 1 }]}>
      {icon}{text}
    </Pressable>
  );
}

export function Qty({ value, onChange, tall = false }: { value: number; onChange: (next: number) => void; tall?: boolean }) {
  return (
    <View style={{
      width: tall ? 120 : 96,
      height: tall ? 52 : 34,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.hair,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: tall ? 16 : 12,
      backgroundColor: colors.white,
    }}>
      <Pressable accessibilityLabel="less" onPress={() => onChange(value - 1)} hitSlop={8}>
        <Text style={{ fontFamily: 'Inter', fontSize: tall ? 22 : 16, fontWeight: '300', color: colors.navy }}>–</Text>
      </Pressable>
      <Text style={{ fontFamily: 'Inter', fontSize: tall ? 15 : 13, fontWeight: '500', color: colors.navy }}>{value}</Text>
      <Pressable accessibilityLabel="more" onPress={() => onChange(value + 1)} hitSlop={8}>
        <Text style={{ fontFamily: 'Inter', fontSize: tall ? 22 : 16, fontWeight: '300', color: colors.navy }}>+</Text>
      </Pressable>
    </View>
  );
}

export function Segment({
  value,
  onChange,
  options,
  track = colors.white,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  track?: string;
}) {
  return (
    <View style={{ height: 42, borderRadius: 999, backgroundColor: track, flexDirection: 'row', padding: 3 }}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={{ flex: 1, borderRadius: 999, backgroundColor: on ? colors.navy : 'transparent', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: 'Inter', fontSize: 12.5, fontWeight: on ? '600' : '500', color: on ? colors.white : colors.ink }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CircleButton({ children, onPress, label }: { children: ReactNode; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: colors.hair, alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 52,
        borderRadius: 999,
        backgroundColor: colors.navy,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        paddingHorizontal: 18,
      })}
    >
      <Text style={{ fontFamily: 'Inter', color: colors.white, fontSize: 13.5, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const nameStyle: TextStyle = { fontFamily: 'Inter', fontSize: 13.5, fontWeight: '600', letterSpacing: -0.2, color: colors.navy };
const noteStyle: TextStyle = { fontFamily: 'Inter', fontSize: 12, color: colors.gray, marginTop: 4 };

export function SeasonCard({ product, width, saved, onSave }: { product: ProductCard; width: number; saved?: boolean; onSave?: () => void }) {
  const height = Math.round(width / 0.8);
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(`/product/${product.id}`)} style={{ width }}>
      <View style={{ width, height, borderTopLeftRadius: 9999, borderTopRightRadius: 9999, overflow: 'hidden', backgroundColor: '#111' }}>
        <FoodImage photo={product.photo} name={product.name} width={width} height={height} />
        {onSave ? (
          <Pressable
            accessibilityLabel={saved ? 'saved' : 'save'}
            onPress={onSave}
            style={{ position: 'absolute', right: 12, bottom: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}
          >
            <IconHeart size={16} filled={saved} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[nameStyle, { marginTop: 14 }]}>{product.headline}</Text>
      <Text style={noteStyle}>
        {product.farmName.toLowerCase()}
        {' · '}
        <Text style={{ color: colors.navy, fontWeight: '600' }}>{dollars(product.priceCents, 'auto')} / {product.unit}</Text>
      </Text>
    </Pressable>
  );
}

export function ShopCard({ product, width }: { product: ProductCard; width: number }) {
  const height = Math.round(width * 1.16);
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(`/product/${product.id}`)} style={{ width }}>
      <View style={{ width, height, borderTopLeftRadius: 9999, borderTopRightRadius: 9999, overflow: 'hidden', backgroundColor: '#111' }}>
        <FoodImage photo={product.photo} name={product.name} width={width} height={height} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 13.5, fontWeight: '500', color: colors.navy, flex: 1 }}>{product.name}</Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 13.5, fontWeight: '600', color: colors.navy }}>{dollars(product.priceCents, 'auto')} / {product.unit}</Text>
      </View>
      {product.note ? <Text style={noteStyle}>{product.note}</Text> : null}
    </Pressable>
  );
}

export function MoreCard({ product, width }: { product: ProductCard; width: number }) {
  const height = Math.round(width * 1.12);
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(`/product/${product.id}`)} style={{ width, alignItems: 'center' }}>
      <View style={{ width, height, borderTopLeftRadius: 9999, borderTopRightRadius: 9999, overflow: 'hidden', backgroundColor: '#111' }}>
        <FoodImage photo={product.photo} name={product.name} width={width} height={height} />
      </View>
      <Text style={[nameStyle, { marginTop: 14, textAlign: 'center' }]}>{product.name}</Text>
      <Text style={[noteStyle, { textAlign: 'center' }]}>
        {product.note}
        {product.note ? ' · ' : ''}
        <Text style={{ color: colors.navy, fontWeight: '600' }}>{dollars(product.priceCents, 'auto')} / {product.unit}</Text>
      </Text>
    </Pressable>
  );
}

export function FarmTile({ farm, onPress }: { farm: FarmCard; onPress?: () => void }) {
  const go = onPress || (() => router.push(`/farms/${farm.slug}`));
  return (
    <Pressable
      accessibilityRole="link"
      onPress={go}
      style={{ flex: 1, borderWidth: 1, borderColor: colors.hair, borderRadius: 22, paddingVertical: 22, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white }}
    >
      <View style={{ width: 62, height: 62, borderRadius: 31, overflow: 'hidden', backgroundColor: colors.cream }}>
        <FoodImage photo={farm.heroPhoto} name={farm.name} width={62} height={62} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={nameStyle}>{farm.name.toLowerCase()}</Text>
        <Text style={noteStyle}>
          {farm.city.toLowerCase()}
          {farm.milesAway != null ? ` · ${miles(farm.milesAway)}` : ''}
          {farm.cardFoods ? ` · ${farm.cardFoods}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          {farm.offersPickup ? <Pill small cream label="pickup" /> : null}
          {farm.offersDelivery ? <Pill small cream label="delivery" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function FulfillmentPills({ pickup, delivery }: { pickup?: string; delivery?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
      {pickup ? <Pill cream label={`pickup · ${pickup}`} icon={<IconPin size={14} />} /> : null}
      {delivery ? <Pill cream label={`delivery · ${delivery}`} icon={<IconTruck size={15} />} /> : null}
    </View>
  );
}

export function Cap({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <Text style={{ fontFamily: 'Inter', fontSize: 10.5, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: muted ? colors.gray : colors.navy }}>
      {children}
    </Text>
  );
}

export function Hair() {
  return <View style={{ height: 1, backgroundColor: colors.hair }} />;
}

export function Grid({ children, cols, gap }: { children: ReactNode[]; cols: number; gap: number }) {
  const { box } = useLayout();
  const width = (box - gap * (cols - 1)) / cols;
  const rows: ReactNode[][] = [];
  children.forEach((child, index) => {
    const row = Math.floor(index / cols);
    rows[row] = rows[row] || [];
    rows[row].push(<View key={index} style={{ width }}>{child}</View>);
  });
  return (
    <View style={{ gap }}>
      {rows.map((row, index) => (
        <View key={index} style={{ flexDirection: 'row', gap }}>
          {row}
          {row.length < cols ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

export function useBoxWidth(cols: number, gap: number) {
  const { box } = useLayout();
  return (box - gap * (cols - 1)) / cols;
}
