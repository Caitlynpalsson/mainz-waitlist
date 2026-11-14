import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/components/chrome';
import { Cap, FulfillmentPills, FoodImage, Grid, Hair, Pill, ShopCard, Wrap, useBoxWidth } from '../../src/components/ui';
import { IconHeart, IconShare } from '../../src/components/icons';
import { CircleButton } from '../../src/components/ui';
import { useApi } from '../../src/lib/useApi';
import { originQuery, usePlace } from '../../src/lib/place';
import { useStore } from '../../src/lib/store';
import type { FarmDetail, ProductCard } from '../../src/lib/types';
import { miles } from '../../src/lib/money';
import { colors, useLayout } from '../../src/theme';

type Payload = { farm: FarmDetail; products: ProductCard[] };

export default function FarmPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const here = usePlace();
  const { data, error, loading } = useApi<Payload>(
    slug && here.ready ? `/api/farms/${slug}?${originQuery(here.place)}` : null,
  );
  const { desktop, shopCols } = useLayout();
  const { follows, toggleFollow } = useStore();
  const [tab, setTab] = useState<'shop' | 'about' | 'pickup' | 'reviews'>('shop');
  const farm = data?.farm;
  const followed = farm ? follows.includes(farm.slug) : false;
  const gap = desktop ? 36 : 14;
  const cell = useBoxWidth(shopCols, gap);
  const archW = desktop ? 380 : Math.min(320, cell * shopCols);
  const archH = Math.round(archW * 1.21);

  return (
    <Shell
      nav="farms"
      tab="farms"
      showTabs
      top="overlay"
      right={farm ? (
        <>
          <CircleButton label={followed ? 'following' : 'follow'} onPress={() => toggleFollow(farm.slug)}>
            <IconHeart filled={followed} />
          </CircleButton>
          <CircleButton label="share" onPress={() => Share.share({ message: `${farm.name} on mainz` }).catch(() => undefined)}>
            <IconShare />
          </CircleButton>
        </>
      ) : null}
    >
      <Wrap style={{ paddingTop: desktop ? 28 : 8 }}>
        {desktop && farm ? (
          <Text style={crumb}>
            farms  /  {farm.city.toLowerCase()}  /  <Text style={{ color: colors.navy }}>{farm.name.toLowerCase()}</Text>
          </Text>
        ) : null}
        {error ? <Text style={quiet}>{error}</Text> : null}
        {loading && !farm ? <Text style={quiet}>loading.</Text> : null}
        {farm ? (
          <>
            <View style={{ marginTop: desktop ? 36 : 12, flexDirection: desktop ? 'row' : 'column', alignItems: 'center', gap: desktop ? 24 : 22 }}>
              <View style={{ width: archW, height: archH, borderTopLeftRadius: 9999, borderTopRightRadius: 9999, overflow: 'hidden', backgroundColor: '#111' }}>
                <FoodImage photo={farm.heroPhoto} name={farm.name} width={archW} height={archH} />
              </View>
              <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: desktop ? 20 : 0 }}>
                <Cap muted>{`${farm.city}, ${farm.state}`.toLowerCase()}{farm.sinceYear ? ` · since ${farm.sinceYear}` : ''}</Cap>
                <Text style={title}>{farm.name}</Text>
                <Text style={bio}>{farm.bio}</Text>
                <View style={{ marginTop: 20 }}>
                  <FulfillmentPills pickup={farm.offersPickup ? farm.pickupSummary : ''} delivery={farm.offersDelivery ? farm.deliverySummary : ''} />
                </View>
                <View style={{ marginTop: 12 }}>
                  <Pill label={followed ? 'following' : 'follow'} on onPress={() => toggleFollow(farm.slug)} />
                </View>
                <View style={{ flexDirection: 'row', gap: desktop ? 36 : 22, marginTop: 32 }}>
                  <Stat n={farm.statValue} label={farm.statLabel} />
                  <Stat n={String(farm.productCount)} label="things in stock" />
                  <Stat n={miles(farm.milesAway)} label="from you" />
                </View>
                <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.gray, marginTop: 26 }}>prices set by the farmer. not by us.</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: desktop ? 40 : 22, marginTop: desktop ? 72 : 40 }}>
              {(['shop', 'about', 'pickup spot', 'reviews'] as const).map((label) => {
                const key = label === 'pickup spot' ? 'pickup' : label;
                const on = tab === key;
                return (
                  <Pressable key={label} onPress={() => setTab(key as typeof tab)}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: on ? '600' : '500', color: on ? colors.navy : colors.gray, borderBottomWidth: on ? 1.5 : 0, borderBottomColor: colors.navy, paddingBottom: 8 }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Hair />
            <View style={{ marginTop: 28 }}>
              {tab === 'shop' ? (
                <Grid cols={shopCols} gap={gap}>
                  {(data?.products || []).map((product) => <ShopCard key={product.id} product={product} width={cell} />)}
                </Grid>
              ) : null}
              {tab === 'about' ? <Text style={prose}>{farm.about || farm.bio}</Text> : null}
              {tab === 'pickup' ? (
                <View style={{ gap: 12, maxWidth: 460, alignSelf: 'center' }}>
                  <Text style={prose}>{farm.pickupSpot || 'pickup details are on the way.'}</Text>
                  {farm.pickupAddress ? <Text style={prose}>{farm.pickupAddress}</Text> : null}
                  {farm.windows.pickup.map((slot) => <Text key={slot.label} style={prose}>{slot.label}</Text>)}
                  {farm.windows.delivery.map((slot) => <Text key={slot.label} style={prose}>delivery {slot.label}</Text>)}
                </View>
              ) : null}
              {tab === 'reviews' ? <Text style={prose}>no reviews yet. they show up after real orders.</Text> : null}
            </View>
          </>
        ) : null}
      </Wrap>
    </Shell>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  if (!n) return null;
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: colors.navy }}>{n}</Text>
      <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.gray, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

const title = { fontFamily: 'Inter' as const, fontWeight: '800' as const, fontSize: 26, letterSpacing: -1, textTransform: 'uppercase' as const, color: colors.navy, marginTop: 12, textAlign: 'center' as const };
const bio = { fontFamily: 'Inter' as const, fontSize: 14, lineHeight: 22, color: colors.ink, textAlign: 'center' as const, marginTop: 12 };
const prose = { fontFamily: 'Inter' as const, fontSize: 14, lineHeight: 22, color: colors.ink, textAlign: 'center' as const };
const crumb = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray };
const quiet = { fontFamily: 'Inter' as const, color: colors.gray, textAlign: 'center' as const, marginTop: 40 };
