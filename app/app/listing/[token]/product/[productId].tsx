import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Shell } from '../../../../src/components/chrome';
import { ArchGallery, Cap, CircleButton, Hair, PrimaryButton, Qty, Wrap } from '../../../../src/components/ui';
import { IconBag } from '../../../../src/components/icons';
import { useApi } from '../../../../src/lib/useApi';
import { usePreviewBag } from '../../../../src/lib/previewBag';
import { dollars, stockLabel } from '../../../../src/lib/money';
import { colors, useLayout } from '../../../../src/theme';
import { LISTING_NEXT_BATCH, draftDisplayPrice, previewItemAddable } from '../../../../../api/src/listing';

type Product = { id?: number; name: string; priceCents: number; unit: string; photoKey: string; availability?: string };
type Listing = {
  farmName: string;
  location: string;
  profilePhoto?: string;
  products: Product[];
  priceFixes?: { productId: number | null; productName: string; priceCents: number }[];
};

export default function PreviewProduct() {
  const { token, productId } = useLocalSearchParams<{ token: string; productId: string }>();
  const { data, error, loading } = useApi<Listing>(token ? `/api/listings/${token}` : null);
  const bag = usePreviewBag(token || '');
  const { desktop, width, box } = useLayout();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const product = data?.products.find((item) => String(item.id) === String(productId));
  const shown = product ? draftDisplayPrice(product, data?.priceFixes || []) : null;
  const addable = product ? previewItemAddable(product.availability || '') : false;
  const archW = desktop ? Math.min(420, (box - 40) / 2) : Math.min(360, width - 40);
  const archH = Math.round(archW * 1.2);
  const price = shown?.priceCents || 0;

  return (
    <Shell
      top="overlay"
      right={(
        <CircleButton label="bag" onPress={() => router.push(`/listing/${token}/bag`)}>
          <View>
            <IconBag size={18} />
            {bag.lines.length ? (
              <View style={{ position: 'absolute', top: -8, right: -10, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{bag.lines.length}</Text>
              </View>
            ) : null}
          </View>
        </CircleButton>
      )}
    >
      <Wrap style={{ paddingTop: desktop ? 28 : 8 }}>
        {error ? <Text style={quiet}>{error}</Text> : null}
        {loading && !product ? <Text style={quiet}>loading.</Text> : null}
        {product && data ? (
          <View style={{ marginTop: desktop ? 28 : 4, flexDirection: desktop ? 'row' : 'column', alignItems: 'center', gap: 20 }}>
            <ArchGallery photos={[{ role: 'hero', photo: product.photoKey, isStock: true }]} name={product.name} width={archW} height={archH} />
            <View style={{ flex: 1, width: '100%', maxWidth: 460, alignItems: 'center' }}>
              <Cap muted>{data.farmName.toLowerCase()}{data.location ? ` · ${data.location.toLowerCase()}` : ''}</Cap>
              <Text style={title}>{product.name}</Text>
              <Text style={{ marginTop: 16, fontFamily: 'Inter', fontSize: 18, fontWeight: '600', color: colors.navy }}>
                {dollars(price, 'auto')}
                <Text style={{ fontWeight: '400', fontSize: 13, color: colors.gray }}> / {product.unit}</Text>
              </Text>
              {product.availability ? <Text style={quiet}>{product.availability}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 22, width: '100%' }}>
                <Qty tall value={qty} onChange={(next) => setQty(Math.max(1, Math.min(12, next)))} />
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={!addable ? LISTING_NEXT_BATCH : added ? 'added' : `add to bag · ${dollars(price * qty, 'auto')}`}
                    disabled={!addable}
                    onPress={() => {
                      const ok = bag.add({
                        productId: product.id || 0,
                        name: product.name,
                        unit: product.unit,
                        qty,
                        unitPriceCents: price,
                        photo: product.photoKey,
                        availability: product.availability || '',
                      });
                      if (ok) setAdded(true);
                    }}
                  />
                </View>
              </View>
              <View style={{ width: '100%', marginTop: 28 }}>
                <Row k="get it" v="pickup or delivery" />
                <Row k="left today" v={addable ? stockLabel(12, product.unit) : LISTING_NEXT_BATCH} />
                <Hair />
              </View>
              <Pressable onPress={() => router.push(`/listing/${token}`)} style={{ marginTop: 18 }}>
                <Text style={{ fontFamily: 'Inter', color: colors.gray, fontSize: 13 }}>back to the farm</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Wrap>
    </Shell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.hair }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 12.5, color: colors.gray }}>{k}</Text>
      <Text style={{ fontFamily: 'Inter', fontSize: 12.5, color: colors.navy }}>{v}</Text>
    </View>
  );
}

const title = { fontFamily: 'Inter' as const, fontWeight: '800' as const, fontSize: 28, letterSpacing: -1.1, textTransform: 'uppercase' as const, color: colors.navy, marginTop: 12, textAlign: 'center' as const };
const quiet = { fontFamily: 'Inter' as const, color: colors.gray, textAlign: 'center' as const, marginTop: 12 };
