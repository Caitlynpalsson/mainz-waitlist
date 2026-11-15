import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Shell } from '../../../src/components/chrome';
import { PrimaryButton, Wrap } from '../../../src/components/ui';
import { api } from '../../../src/lib/api';
import { adminHeaders, useAdminToken } from '../../../src/lib/adminAuth';
import { colors, useLayout } from '../../../src/theme';

const PHOTOS = ['peach', 'strawberry', 'carrot', 'honey', 'tomato', 'beets', 'comb', 'cow'];

type ProductDraft = { name: string; price: string; unit: string; photoKey: string; priceStatus?: string; needsUdafCheck?: boolean };
type Listing = {
  id: number;
  path: string;
  farmName: string;
  story: string;
  location: string;
  statusLabel: string;
  status: string;
  changeNote: string;
  approvedAt: string;
  denyReason?: string;
  deniedAt?: string;
  isSample: boolean;
  products: { name: string; priceCents: number; unit: string; photoKey: string; priceStatus?: string; needsUdafCheck?: boolean }[];
};

const emptyProduct = (): ProductDraft => ({ name: '', price: '', unit: '', photoKey: 'peach' });

export default function ListingEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const creating = id === 'new';
  const { desktop } = useLayout();
  const auth = useAdminToken();
  const [farmName, setFarmName] = useState('');
  const [story, setStory] = useState('');
  const [location, setLocation] = useState('');
  const [products, setProducts] = useState<ProductDraft[]>([emptyProduct()]);
  const [saved, setSaved] = useState<Listing | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth.token || creating || !id) return;
    api<{ listing: Listing }>(`/api/admin/listings/${id}`, { headers: adminHeaders(auth.token) })
      .then((data) => {
        setSaved(data.listing);
        setFarmName(data.listing.farmName);
        setStory(data.listing.story);
        setLocation(data.listing.location);
        setProducts(data.listing.products.map((product) => ({
          name: product.name,
          price: (product.priceCents / 100).toFixed(2),
          unit: product.unit,
          photoKey: product.photoKey,
          priceStatus: product.priceStatus,
          needsUdafCheck: product.needsUdafCheck,
        })));
      })
      .catch((err: Error) => setError(err.message));
  }, [auth.token, creating, id]);

  async function save() {
    if (!auth.token) return;
    setError('');
    const body = {
      farmName,
      story,
      location,
      products: products.filter((product) => product.name.trim()).map((product) => ({
        name: product.name,
        unit: product.unit,
        photoKey: product.photoKey,
        priceCents: Math.round(Number(product.price) * 100),
        priceStatus: product.priceStatus || 'public',
        needsUdafCheck: !!product.needsUdafCheck,
      })),
    };
    try {
      const data = creating
        ? await api<{ listing: Listing }>('/api/admin/listings', { method: 'POST', headers: adminHeaders(auth.token), body: JSON.stringify(body) })
        : await api<{ listing: Listing }>(`/api/admin/listings/${id}`, { method: 'PATCH', headers: adminHeaders(auth.token), body: JSON.stringify(body) });
      setSaved(data.listing);
      if (creating) router.replace(`/admin/listing/${data.listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not save.');
    }
  }

  async function markSent() {
    if (!auth.token || !saved) return;
    setError('');
    try {
      const data = await api<{ listing: Listing }>(`/api/admin/listings/${saved.id}/sent`, { method: 'POST', headers: adminHeaders(auth.token) });
      setSaved(data.listing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not mark it sent.');
    }
  }

  return (
    <Shell top="bar" title="listing">
      <Wrap style={{ paddingTop: desktop ? 48 : 16 }}>
        <View style={{ maxWidth: 460, alignSelf: 'center', width: '100%' }}>
          {!auth.token ? (
            <>
              <Text style={quiet}>open the admin desk first so this page has the token.</Text>
              <View style={{ marginTop: 16, maxWidth: 220 }}>
                <PrimaryButton label="admin desk" onPress={() => router.push('/admin')} />
              </View>
            </>
          ) : (
            <>
              <Text style={headline}>{creating ? 'new listing' : farmName.toLowerCase() || 'listing'}</Text>
              {saved ? <Text style={quiet}>{saved.isSample ? 'sample. ' : ''}{saved.statusLabel}{saved.denyReason ? `. ${saved.denyReason}` : ''}{saved.deniedAt ? `. ${saved.deniedAt.slice(0, 10)}` : ''}{saved.changeNote ? `. note: ${saved.changeNote}` : ''}{saved.approvedAt ? `. approved ${saved.approvedAt.slice(0, 10)}` : ''}</Text> : null}
              <Field label="farm name" value={farmName} onChange={setFarmName} />
              <Field label="story line" value={story} onChange={setStory} />
              <Field label="location" value={location} onChange={setLocation} />
              {products.map((product, index) => (
                <View key={index} style={{ marginTop: 28 }}>
                  <Field label="product" value={product.name} onChange={(name) => edit(index, { name })} />
                  <Field label="price in dollars" value={product.price} onChange={(price) => edit(index, { price })} />
                  <Field label="unit" value={product.unit} onChange={(unit) => edit(index, { unit })} />
                  <Text style={quiet}>{product.priceStatus && product.priceStatus !== 'public' ? product.priceStatus : 'public price'}{product.needsUdafCheck ? ' · udaf check' : ''}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 12 }}>
                    {PHOTOS.map((key) => (
                      <Pressable key={key} onPress={() => edit(index, { photoKey: key })}>
                        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: product.photoKey === key ? colors.navy : colors.gray, fontWeight: product.photoKey === key ? '600' : '400' }}>{key}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
              <Pressable onPress={() => setProducts((current) => [...current, emptyProduct()])} style={{ marginTop: 18, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter', color: colors.gray }}>add another product</Text>
              </Pressable>
              {error ? <Text style={[quiet, { color: colors.red, marginTop: 16 }]}>{error}</Text> : null}
              <View style={{ marginTop: 22 }}>
                <PrimaryButton label="save listing" onPress={save} />
              </View>
              {saved && saved.status !== 'farm_approved' ? (
                <View style={{ marginTop: 12 }}>
                  <PrimaryButton label={saved.status === 'farm_denied' ? 'resend' : 'mark sent'} onPress={markSent} />
                  {saved.status === 'farm_denied' ? <Text style={quiet}>resend makes a new link. the old page stays removed.</Text> : null}
                </View>
              ) : null}
              {saved ? (
                <>
                  <Text style={[quiet, { marginTop: 28 }]}>farm link. select to copy.</Text>
                  <TextInput editable={false} selectTextOnFocus value={saved.path} style={field} />
                </>
              ) : null}
            </>
          )}
        </View>
      </Wrap>
    </Shell>
  );

  function edit(index: number, patch: Partial<ProductDraft>) {
    setProducts((current) => current.map((product, i) => i === index ? { ...product, ...patch } : product));
  }
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={label}
      placeholderTextColor={colors.gray}
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel={label}
      style={field}
    />
  );
}

const headline = { fontFamily: 'Inter' as const, fontSize: 28, fontWeight: '600' as const, color: colors.navy, textAlign: 'center' as const };
const quiet = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 8 };
const field = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, textAlign: 'center' as const, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 12, marginTop: 14 };
