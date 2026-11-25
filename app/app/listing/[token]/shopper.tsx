import { useEffect, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleBack, Shell } from '../../../src/components/chrome';
import { FarmBelow } from '../../../src/components/farmBelow';
import { Cap, CircleButton, FarmAvatar, FoodImage, FulfillmentPills, Grid, Hair, Pill, ShopCard, Wrap, useBoxWidth } from '../../../src/components/ui';
import { IconHeart, IconShare } from '../../../src/components/icons';
import { api } from '../../../src/lib/api';
import { adminHeaders, useAdminToken } from '../../../src/lib/adminAuth';
import { useStore } from '../../../src/lib/store';
import { miles } from '../../../src/lib/money';
import { colors, useLayout } from '../../../src/theme';
import { photoSource } from '../../../src/lib/photos';
import { ProductSearchField, ProductSearchIcon, SEARCH_EMPTY } from '../../../src/components/miniSearch';
import { searchProducts } from '../../../../api/src/search';
import { STAFF_PREVIEW_TAG } from '../../../../api/src/listing';
import { STAFF_SESSION_KEY } from '../../../../api/src/staffPreview';

type Farm = {
  name: string;
  city: string;
  state: string;
  bio: string;
  about: string;
  profilePhoto: string;
  heroPhoto: string;
  meetLine: string;
  pickupLine: string;
  pickupDays: string;
  deliveryDay: string;
  offersPickup: boolean;
  offersDelivery: boolean;
  pickupSummary: string;
  deliverySummary: string;
  sinceYear: number | null;
  statValue: string;
  statLabel: string;
  productCount: number;
  milesAway: number | null;
  slug: string;
};

type Product = { id: number; name: string; priceCents: number; unit: string; photo: string };
type Payload = { staffPreview: true; tag: string; shopVisible: false; farm: Farm; products: Product[] };

export default function StaffShopperPreview() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const auth = useAdminToken();
  const { desktop, shopCols } = useLayout();
  const insets = useSafeAreaInsets();
  const { follows, toggleFollow } = useStore();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'shop' | 'about' | 'reviews'>('shop');
  const [hideChrome, setHideChrome] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const gap = desktop ? 36 : 14;
  const cell = useBoxWidth(shopCols, gap);
  const farm = data?.farm;
  const followKey = token ? `draft-${token}` : '';
  const followed = followKey ? follows.includes(followKey) : false;
  const archW = desktop ? 380 : Math.min(320, cell * shopCols);
  const archH = Math.round(archW * 1.21);
  const searching = productQuery.trim().length > 0;
  const closeSearch = () => { setSearchOpen(false); setProductQuery(''); };

  useEffect(() => {
    if (!auth.ready || signedOut) return undefined;
    const session = typeof localStorage === 'undefined' ? '' : (localStorage.getItem(STAFF_SESSION_KEY) || '');
    if ((!auth.token && !session) || !token) {
      setData(null);
      setError('that farm is not on the main course.');
      setLoading(false);
      return undefined;
    }
    let cancel = false;
    setLoading(true);
    const headers = auth.token ? adminHeaders(auth.token) : { 'x-staff-session': session };
    api<Payload>(`/api/listings/${token}/shopper`, { headers })
      .then((next) => {
        if (!cancel) {
          setData(next);
          setError('');
        }
      })
      .catch((err: Error) => {
        if (!cancel) {
          setData(null);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [auth.ready, auth.token, token, signedOut]);

  async function signOutStaff() {
    const session = typeof localStorage === 'undefined' ? '' : (localStorage.getItem(STAFF_SESSION_KEY) || '');
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STAFF_SESSION_KEY);
    if (session) {
      await api('/api/staff-preview/sign-out', { method: 'POST', headers: { 'x-staff-session': session } }).catch(() => undefined);
    }
    setData(null);
    setSignedOut(true);
  }

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
          <CircleButton label={followed ? 'following' : 'follow'} onPress={() => toggleFollow(followKey)}>
            <IconHeart filled={followed} />
          </CircleButton>
          <CircleButton label="share" onPress={() => Share.share({ message: `${farm.name} on the main course` }).catch(() => undefined)}>
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
      <Wrap style={{ paddingTop: desktop ? 28 : insets.top + 56 }}>
        {desktop && farm && !searchOpen ? (
          <View style={{ alignItems: 'flex-end' }}>
            <ProductSearchIcon onPress={() => setSearchOpen(true)} />
          </View>
        ) : null}
        {signedOut ? <Text style={quiet}>signed out</Text> : null}
        {error ? <Text style={quiet}>{error}</Text> : null}
        {loading && !farm ? <Text style={quiet}>loading.</Text> : null}
        {farm ? (
          <>
            <View style={staffTag}><Text style={staffTagText}>{data?.tag || STAFF_PREVIEW_TAG}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="sign out staff" onPress={signOutStaff} style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
              <Text style={staffTagText}>sign out staff</Text>
            </Pressable>
            {searching ? null : <View style={{ marginTop: desktop ? 28 : 12, flexDirection: desktop ? 'row' : 'column', alignItems: 'center', gap: desktop ? 24 : 22 }}>
              {farm.heroPhoto && photoSource(farm.heroPhoto) ? (
                <View style={{ width: archW, height: archH, borderTopLeftRadius: 9999, borderTopRightRadius: 9999, overflow: 'hidden', backgroundColor: '#111' }}>
                  <FoodImage photo={farm.heroPhoto} name={farm.name} width={archW} height={archH} />
                </View>
              ) : null}
              <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: desktop ? 20 : 0 }}>
                <FarmAvatar photo={farm.profilePhoto} name={farm.name} size={desktop ? 96 : 72} />
                {farm.city ? <Cap muted>{`${farm.city}${farm.state ? `, ${farm.state}` : ''}`.toLowerCase()}</Cap> : null}
                <Text style={title}>{farm.name.toLowerCase()}</Text>
                {farm.bio ? <Text style={bio}>{farm.bio}</Text> : null}
                {farm.pickupDays || farm.deliveryDay ? (
                  <View style={{ marginTop: 20 }}>
                    <FulfillmentPills pickup={farm.pickupDays} delivery={farm.deliveryDay} />
                  </View>
                ) : null}
                <View style={{ marginTop: 12 }}>
                  <Pill label={followed ? 'following' : 'follow'} on onPress={() => toggleFollow(followKey)} />
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
                    {searchProducts(data?.products || [], productQuery).map((product) => (
                      <ShopCard
                        key={product.id}
                        width={cell}
                        product={product}
                        onPress={() => router.push(`/listing/${token}/product/${product.id}`)}
                      />
                    ))}
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
                  town={`${farm.city}${farm.state ? `, ${farm.state}` : ''}`}
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
const quiet = { fontFamily: 'Inter' as const, color: colors.gray, textAlign: 'center' as const, marginTop: 40 };
const staffTag = { alignSelf: 'center' as const, backgroundColor: colors.cream, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 };
const staffTagText = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray };
