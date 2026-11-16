import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CircleBack, Shell } from '../../src/components/chrome';
import { FarmBelow } from '../../src/components/farmBelow';
import { Cap, FarmAvatar, FulfillmentPills, FoodImage, Grid, Hair, Pill, ShopCard, Wrap, useBoxWidth } from '../../src/components/ui';
import { IconHeart, IconShare } from '../../src/components/icons';
import { CircleButton } from '../../src/components/ui';
import { useApi } from '../../src/lib/useApi';
import { originQuery, usePlace } from '../../src/lib/place';
import { useStore } from '../../src/lib/store';
import type { FarmDetail, ProductCard } from '../../src/lib/types';
import { miles } from '../../src/lib/money';
import { photoSource } from '../../src/lib/photos';
import { ProductSearchField, ProductSearchIcon, SEARCH_EMPTY } from '../../src/components/miniSearch';
import { searchProducts } from '../../../api/src/search';
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
  const [tab, setTab] = useState<'shop' | 'about' | 'reviews'>('shop');
  const [hideChrome, setHideChrome] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const farm = data?.farm;
  const followed = farm ? follows.includes(farm.slug) : false;
  const gap = desktop ? 36 : 14;
  const cell = useBoxWidth(shopCols, gap);
  const archW = desktop ? 380 : Math.min(320, cell * shopCols);
  const archH = Math.round(archW * 1.21);
  const searching = productQuery.trim().length > 0;
  const closeSearch = () => { setSearchOpen(false); setProductQuery(''); };

  return (
    <Shell
      nav="farms"
      tab="farms"
      showTabs
      top="overlay"
      hideOverlay={hideChrome || searchOpen}
      onScroll={(y) => setHideChrome(y > 72)}
      right={farm && !searchOpen ? (
        <>
          <ProductSearchIcon onPress={() => setSearchOpen(true)} />
          <CircleButton label={followed ? 'following' : 'follow'} onPress={() => toggleFollow(farm.slug)}>
            <IconHeart filled={followed} />
          </CircleButton>
          <CircleButton label="share" onPress={() => Share.share({ message: `${farm.name} on mainz` }).catch(() => undefined)}>
            <IconShare />
          </CircleButton>
        </>
      ) : null}
      sticky={searchOpen && farm ? (
        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {desktop ? null : <CircleBack />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <ProductSearchField
              farmName={farm.name}
              value={productQuery}
              onChange={(value) => { setProductQuery(value); if (value.trim()) setTab('shop'); }}
              onClose={closeSearch}
            />
          </View>
        </View>
      ) : null}
    >
      <Wrap style={{ paddingTop: desktop ? 28 : 8 }}>
        {desktop && farm && !searchOpen ? (
          <View style={{ alignItems: 'flex-end' }}>
            <ProductSearchIcon onPress={() => setSearchOpen(true)} />
          </View>
        ) : null}
        {desktop && farm ? (
          <Text style={crumb}>
            farms  /  {farm.city.toLowerCase()}  /  <Text style={{ color: colors.navy }}>{farm.name.toLowerCase()}</Text>
          </Text>
        ) : null}
        {error ? <Text style={quiet}>{error}</Text> : null}
        {loading && !farm ? <Text style={quiet}>loading.</Text> : null}
        {farm ? (
          <>
            {searching ? null : <View style={{ marginTop: desktop ? 36 : 12, flexDirection: desktop ? 'row' : 'column', alignItems: 'center', gap: desktop ? 24 : 22 }}>
              {farm.heroPhoto && photoSource(farm.heroPhoto) ? (
                <View style={{ width: archW, height: archH, borderTopLeftRadius: 9999, borderTopRightRadius: 9999, overflow: 'hidden', backgroundColor: '#111' }}>
                  <FoodImage photo={farm.heroPhoto} name={farm.name} width={archW} height={archH} />
                </View>
              ) : null}
              <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: desktop ? 20 : 0 }}>
                <FarmAvatar photo={farm.profilePhoto} name={farm.name} size={desktop ? 96 : 72} />
                <Cap muted>{`${farm.city}, ${farm.state}`.toLowerCase()}{farm.sinceYear ? ` · since ${farm.sinceYear}` : ''}</Cap>
                <Text style={title}>{farm.name.toLowerCase()}</Text>
                <Text style={bio}>{farm.bio}</Text>
                <View style={{ marginTop: 20 }}>
                  <FulfillmentPills
                    pickup={farm.pickupDays || (farm.offersPickup ? farm.pickupSummary : '')}
                    delivery={farm.pickupDays ? farm.deliveryDay : (farm.offersDelivery ? farm.deliverySummary : '')}
                  />
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
            </View>}

            {searching ? null : <View style={{ flexDirection: 'row', justifyContent: 'center', gap: desktop ? 40 : 22, marginTop: desktop ? 72 : 40 }}>
              {(['shop', 'about', 'reviews'] as const).map((label) => {
                const on = tab === label;
                return (
                  <Pressable key={label} onPress={() => setTab(label)}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: on ? '600' : '500', color: on ? colors.navy : colors.gray, borderBottomWidth: on ? 1.5 : 0, borderBottomColor: colors.navy, paddingBottom: 8 }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>}
            {searching ? null : <Hair />}
            <View style={{ marginTop: searching ? 8 : 28 }}>
              {tab === 'shop' ? (
                <>
                  <Grid cols={shopCols} gap={gap}>
                    {searchProducts(data?.products || [], productQuery).map((product) => <ShopCard key={product.id} product={product} width={cell} />)}
                  </Grid>
                  {productQuery && searchProducts(data?.products || [], productQuery).length === 0 ? <Text style={quiet}>{SEARCH_EMPTY}</Text> : null}
                </>
              ) : null}
              {tab === 'about' ? <Text style={prose}>{farm.about || farm.bio}</Text> : null}
              {tab === 'reviews' ? <Text style={prose}>no reviews yet. they show up after real orders.</Text> : null}
              {tab === 'shop' && !searching ? (
                <FarmBelow
                  story={farm.about || ''}
                  alreadyShown={farm.bio}
                  town={`${farm.city}, ${farm.state}`}
                  grows={(data?.products || []).map((product) => product.name)}
                  sinceYear={farm.sinceYear}
                  meetLine={farm.meetLine}
                  pickupLine={farm.pickupLine}
                  photo={farm.profilePhoto}
                  hero={farm.heroPhoto}
                  width={cell * shopCols}
                />
              ) : null}
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

const title = { fontFamily: 'Inter' as const, fontWeight: '600' as const, fontSize: 26, letterSpacing: -0.4, color: colors.navy, marginTop: 12, textAlign: 'center' as const };
const bio = { fontFamily: 'Inter' as const, fontSize: 14, lineHeight: 22, color: colors.ink, textAlign: 'center' as const, marginTop: 12 };
const prose = { fontFamily: 'Inter' as const, fontSize: 14, lineHeight: 22, color: colors.ink, textAlign: 'center' as const };
const crumb = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray };
const quiet = { fontFamily: 'Inter' as const, color: colors.gray, textAlign: 'center' as const, marginTop: 40 };
