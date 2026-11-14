import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Shell } from '../src/components/chrome';
import { Logo } from '../src/components/logo';
import { Cap, FarmTile, Grid, Pill, SeasonCard, Wrap, useBoxWidth } from '../src/components/ui';
import { IconPin, IconSearch } from '../src/components/icons';
import { useApi } from '../src/lib/useApi';
import { originQuery, usePlace } from '../src/lib/place';
import { useStore } from '../src/lib/store';
import type { BrowseResponse, ProductCard } from '../src/lib/types';
import { colors, useLayout } from '../src/theme';

const CATS = ['all', 'produce', 'eggs', 'honey', 'dairy', 'meat'];

export default function Browse() {
  const params = useLocalSearchParams<{ q?: string; category?: string; pickup?: string; season?: string }>();
  const q = one(params.q);
  const category = CATS.includes(one(params.category)) ? one(params.category) : 'all';
  const pickup = params.pickup === 'today';
  const season = params.season === 'all' ? 'all' : 'week';
  const here = usePlace();
  const { data, error, loading } = useApi<BrowseResponse>(
    here.ready
      ? `/api/browse?q=${encodeURIComponent(q)}&category=${category}&pickup=${pickup ? 'today' : ''}&season=${season}&${originQuery(here.place)}`
      : null,
  );
  const { desktop, seasonCols } = useLayout();
  const { saved, toggleSaved } = useStore();
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== q) router.setParams({ q: draft });
    }, 280);
    return () => clearTimeout(timer);
  }, [draft, q]);

  const products = data?.products || [];
  const farms = data?.farms || [];
  const gap = desktop ? 36 : 18;
  const cols = !desktop && !q && season === 'week' ? 1 : desktop ? seasonCols : 2;
  const cell = useBoxWidth(Math.max(cols, 1), gap);

  return (
    <Shell nav="browse" tab="browse" showTabs top="browse">
      <Wrap style={{ paddingTop: desktop ? 36 : 8 }}>
        <View style={{ alignItems: 'center' }}>
          <Logo size={desktop ? 16 : 15} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="change location"
            onPress={here.openPicker}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: desktop ? 22 : 16 }}
          >
            <IconPin size={14} />
            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: colors.gray }}>
              {here.place.name.toLowerCase()}, ut · {data ? data.farmCount : '–'} farm{data?.farmCount === 1 ? '' : 's'} near you
            </Text>
          </Pressable>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', letterSpacing: -0.3, color: colors.navy, marginTop: 14, textAlign: 'center' }}>
            real food. from people with names.
          </Text>
        </View>

        {!desktop ? (
          <View style={{ marginTop: 22, height: 44, borderRadius: 999, backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
            <IconSearch size={16} />
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="eggs, honey, a farm, a person"
              placeholderTextColor="#6d7180"
              style={{ flex: 1, fontFamily: 'Inter', fontSize: 14, color: colors.navy, padding: 0 }}
              accessibilityLabel="search"
            />
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 22 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2, justifyContent: desktop ? 'center' : 'flex-start', minWidth: desktop ? '100%' : undefined }}>
          {CATS.map((cat) => (
            <Pill key={cat} label={cat} on={category === cat && !pickup} onPress={() => router.setParams({ category: cat === 'all' ? '' : cat, pickup: '' })} />
          ))}
          <Pill label="pickup today" on={pickup} onPress={() => router.setParams({ pickup: pickup ? '' : 'today' })} />
        </ScrollView>

        {error ? <Text style={quiet}>{error}</Text> : null}
        {loading && !data ? <Text style={quiet}>loading the market.</Text> : null}

        <View style={{ marginTop: desktop ? 84 : 36 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }}>
            <Cap>{q ? 'matches' : 'in season this week'}</Cap>
            {!q && season === 'week' ? (
              <Pressable onPress={() => router.setParams({ season: 'all' })}><Text style={see}>see all</Text></Pressable>
            ) : null}
          </View>
          {!desktop && !q && season === 'week' ? (
            <MobileSeason products={products} saved={saved} onSave={toggleSaved} />
          ) : (
            <Grid cols={cols} gap={gap}>
              {products.map((product) => (
                <SeasonCard key={product.id} product={product} width={cell} saved={saved.includes(product.id)} onSave={() => toggleSaved(product.id)} />
              ))}
            </Grid>
          )}
          {!loading && products.length === 0 ? <Text style={quiet}>nothing under that name yet.</Text> : null}
        </View>

        <View style={{ marginTop: desktop ? 88 : 48 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }}>
            <Cap>farms near you</Cap>
            <Pressable onPress={() => router.push('/farms')}><Text style={see}>see all {data?.farmCount || ''}</Text></Pressable>
          </View>
          <FarmGrid farms={farms.slice(0, 3)} />
          {!loading && farms.length === 0 ? (
            <Text style={quiet}>no farms within 40 miles of {here.place.name.toLowerCase()} yet.</Text>
          ) : null}
        </View>

        {!q ? (
          <View style={{ marginTop: desktop ? 88 : 48, backgroundColor: colors.cream, borderRadius: 28, paddingVertical: desktop ? 64 : 40, paddingHorizontal: 24, alignItems: 'center' }}>
            <Cap muted>the mainz standard</Cap>
            <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', letterSpacing: -0.3, color: colors.navy, marginTop: 14, textAlign: 'center' }}>
              we pick the farms. so you don't have to research fifteen of them.
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.ink, marginTop: 10, textAlign: 'center' }}>
              quality. transparency. food safety. fair prices. showing up.
            </Text>
            <View style={{ marginTop: 22 }}>
              <Pill label="how we choose" onPress={() => router.push('/standard')} />
            </View>
          </View>
        ) : null}
        {!desktop ? (
          <Text style={{ fontFamily: 'Inter', fontSize: 10, color: '#a3a7b2', textAlign: 'center', marginTop: 36 }}>sample farms, made up for the mockup.</Text>
        ) : null}
      </Wrap>
    </Shell>
  );
}

function MobileSeason({ products, saved, onSave }: { products: ProductCard[]; saved: number[]; onSave: (id: number) => void }) {
  const { width } = useLayout();
  const card = Math.min(340, width - 72);
  return (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={card + 16} contentContainerStyle={{ gap: 16 }}>
        {products.map((product) => (
          <SeasonCard key={product.id} product={product} width={card} saved={saved.includes(product.id)} onSave={() => onSave(product.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function FarmGrid({ farms }: { farms: BrowseResponse['farms'] }) {
  const { farmCols } = useLayout();
  const gap = 18;
  const cell = useBoxWidth(farmCols, gap);
  const rows: typeof farms[] = [];
  farms.forEach((farm, index) => {
    const row = Math.floor(index / farmCols);
    rows[row] = rows[row] || [];
    rows[row].push(farm);
  });
  return (
    <View style={{ gap }}>
      {rows.map((row, index) => (
        <View key={index} style={{ flexDirection: 'row', gap }}>
          {row.map((farm) => (
            <View key={farm.id} style={{ width: cell }}>
              <FarmTile farm={farm} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

const quiet = { fontFamily: 'Inter' as const, color: colors.gray, textAlign: 'center' as const, marginTop: 28, fontSize: 13 };
const see = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray };
