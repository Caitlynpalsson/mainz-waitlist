import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/components/chrome';
import { ArchGallery, Cap, CircleButton, Grid, Hair, MoreCard, Pill, PrimaryButton, Qty, Wrap, useBoxWidth } from '../../src/components/ui';
import { IconBag } from '../../src/components/icons';
import { useApi } from '../../src/lib/useApi';
import { useStore } from '../../src/lib/store';
import type { ProductCard, ProductDetail, ProductOption } from '../../src/lib/types';
import { dollars, stockLabel } from '../../src/lib/money';
import { colors, useLayout } from '../../src/theme';

type Payload = { product: ProductDetail; more: ProductCard[] };

export default function ProductPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading } = useApi<Payload>(id ? `/api/products/${id}` : null);
  const product = data?.product;
  const { desktop, width, shopCols, box } = useLayout();
  const store = useStore();
  const [optionId, setOptionId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const selected = product?.options.find((option) => option.id === (optionId ?? product.options[0]?.id)) || null;
  const price = selected?.priceCents ?? product?.priceCents ?? 0;
  const unit = selected?.unit ?? product?.unit ?? '';
  const gap = desktop ? 36 : 14;
  const cell = useBoxWidth(shopCols, gap);
  const archW = desktop ? Math.min(420, (box - 40) / 2) : Math.min(360, width - 40);
  const archH = Math.round(archW * 1.2);

  return (
    <Shell
      nav="browse"
      top="overlay"
      right={(
        <CircleButton label="bag" onPress={() => router.push('/bag')}>
          <View>
            <IconBag size={18} />
            {store.lines.length ? (
              <View style={{ position: 'absolute', top: -8, right: -10, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{store.lines.length}</Text>
              </View>
            ) : null}
          </View>
        </CircleButton>
      )}
    >
      <Wrap style={{ paddingTop: desktop ? 28 : 8 }}>
        {desktop && product ? (
          <Text style={crumb}>
            <Text onPress={() => router.push('/farms')}>farms</Text>
            {'  /  '}
            <Text onPress={() => router.push(`/farms/${product.farm.slug}`)}>{product.farm.name.toLowerCase()}</Text>
            {'  /  '}
            <Text style={{ color: colors.navy }}>{product.name}</Text>
          </Text>
        ) : null}
        {error ? <Text style={quiet}>{error}</Text> : null}
        {loading && !product ? <Text style={quiet}>loading.</Text> : null}
        {product ? (
          <>
            <View style={{ marginTop: desktop ? 28 : 4, flexDirection: desktop ? 'row' : 'column', alignItems: 'center', gap: 20 }}>
              <ArchGallery photos={product.photos} name={product.name} width={archW} height={archH} />
              <View style={{ flex: 1, width: '100%', maxWidth: 460, alignItems: 'center' }}>
                <Cap muted>{product.farm.name.toLowerCase()} · {product.farm.city.toLowerCase()}</Cap>
                <Text style={title}>{product.name}</Text>
                {product.dek ? <Text style={dek}>{product.dek}</Text> : null}
                <Text style={{ marginTop: 16, fontFamily: 'Inter', fontSize: 18, fontWeight: '600', color: colors.navy }}>
                  {dollars(price, 'auto')}
                  <Text style={{ fontWeight: '400', fontSize: 13, color: colors.gray }}> / {unit}{product.priceSetter ? ` · price set by ${product.priceSetter}` : ''}</Text>
                </Text>
                <OptionRow options={product.options.filter((option) => option.kind === 'variety')} base={product.priceCents} selected={selected?.id} onSelect={setOptionId} />
                <OptionRow options={product.options.filter((option) => option.kind === 'pack')} base={product.priceCents} selected={selected?.id} onSelect={setOptionId} />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 22, width: '100%' }}>
                  <Qty tall value={qty} onChange={(next) => setQty(Math.max(1, Math.min(product.stockQty || 1, next)))} />
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label={product.stockQty < 1 ? 'sold out' : added ? 'added' : `add to bag · ${dollars(price * qty, 'auto')}`}
                      disabled={product.stockQty < 1}
                      onPress={() => {
                        store.add({
                          productId: product.id,
                          optionId: selected?.id ?? null,
                          qty,
                          farmId: product.farm.id,
                          farmName: product.farm.name,
                          farmSlug: product.farm.slug,
                          farmCity: product.farm.city,
                          offersPickup: product.farm.offersPickup,
                          offersDelivery: product.farm.offersDelivery,
                          pickupSummary: product.farm.pickupSummary,
                          deliverySummary: product.farm.deliverySummary,
                          windows: product.farm.windows,
                          name: product.name,
                          optionLabel: selected?.name || '',
                          unit,
                          unitPriceCents: price,
                          photo: product.photos[0]?.photo || 'placeholder',
                          note: product.note,
                          stockQty: product.stockQty,
                        });
                        setAdded(true);
                      }}
                    />
                  </View>
                </View>
                <View style={{ width: '100%', marginTop: 28 }}>
                  <Meta k="picked" v={product.pickedLabel || 'this week'} />
                  <Meta k="grown" v={product.grownNote || 'ask the farm'} />
                  <Meta k="get it" v={getIt(product)} />
                  <Meta k="left today" v={stockLabel(product.stockQty, product.unit)} dot />
                  <Hair />
                </View>
              </View>
            </View>
            {data?.more.length ? (
              <View style={{ marginTop: desktop ? 88 : 48 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 }}>
                  <Cap>more from {product.farm.name.toLowerCase()}</Cap>
                  <Pressable onPress={() => router.push(`/farms/${product.farm.slug}`)}><Text style={{ fontFamily: 'Inter', color: colors.gray, fontSize: 12 }}>see the farm</Text></Pressable>
                </View>
                <Grid cols={shopCols} gap={gap}>
                  {data.more.map((item) => <MoreCard key={item.id} product={item} width={cell} />)}
                </Grid>
              </View>
            ) : null}
          </>
        ) : null}
      </Wrap>
    </Shell>
  );
}

function OptionRow({ options, base, selected, onSelect }: { options: ProductOption[]; base: number; selected?: number; onSelect: (id: number) => void }) {
  if (!options.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 }}>
      {options.map((option) => (
        <Pill
          key={option.id}
          on={option.id === selected}
          onPress={() => onSelect(option.id)}
          label={option.kind === 'variety' && option.priceCents === base ? option.name : `${option.name} · ${dollars(option.priceCents, 'auto')}`}
        />
      ))}
    </View>
  );
}

function Meta({ k, v, dot = false }: { k: string; v: string; dot?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.hair }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 12.5, color: colors.gray }}>{k}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.red }} /> : null}
        <Text style={{ fontFamily: 'Inter', fontSize: 12.5, color: colors.navy }}>{v}</Text>
      </View>
    </View>
  );
}

function getIt(product: ProductDetail): string {
  const bits = [];
  if (product.farm.offersPickup && product.farm.pickupSummary) bits.push(`pickup ${product.farm.pickupSummary}`);
  if (product.farm.offersDelivery && product.farm.deliverySummary) bits.push(`delivery ${product.farm.deliverySummary}`);
  return bits.join(' · ') || 'see the farm';
}

const title = { fontFamily: 'Inter' as const, fontWeight: '800' as const, fontSize: 28, letterSpacing: -1.1, textTransform: 'uppercase' as const, color: colors.navy, marginTop: 12, textAlign: 'center' as const };
const dek = { fontFamily: 'Inter' as const, fontSize: 14, color: colors.ink, marginTop: 10, textAlign: 'center' as const };
const crumb = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray };
const quiet = { fontFamily: 'Inter' as const, color: colors.gray, textAlign: 'center' as const, marginTop: 40 };
