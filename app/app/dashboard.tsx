import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../src/components/chrome';
import { Cap, FoodImage, Pill, PrimaryButton, Wrap } from '../src/components/ui';
import { api } from '../src/lib/api';
import { dollars } from '../src/lib/money';
import { prepareFarmerPhoto } from '../src/lib/uploadPhoto';
import type { CatalogFood, Windows } from '../src/lib/types';
import { colors, useLayout } from '../src/theme';

const TOKEN_KEY = 'mainz.farmToken';

type Owned = {
  id: number;
  name: string;
  headline: string;
  note: string;
  priceCents: number;
  unit: string;
  stockQty: number;
  active: boolean;
  photo: string;
  photos: { role: string; photo: string; isStock: boolean }[];
};

type Me = {
  farm: {
    name: string;
    status: string;
    active: boolean;
    offersPickup: boolean;
    offersDelivery: boolean;
    pickupSummary: string;
    deliverySummary: string;
    bio: string;
    windows: Windows;
  };
  products: Owned[];
};

export default function Dashboard() {
  const params = useLocalSearchParams<{ token?: string }>();
  const { desktop } = useLayout();
  const [token, setToken] = useState('');
  const [draft, setDraft] = useState('');
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<CatalogFood[]>([]);
  const [picked, setPicked] = useState<CatalogFood | null>(null);
  const [price, setPrice] = useState('6');
  const [stock, setStock] = useState('10');
  const [varieties, setVarieties] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fromLink = typeof params.token === 'string' ? params.token : '';
    if (fromLink) {
      setToken(fromLink);
      setDraft(fromLink);
      AsyncStorage.setItem(TOKEN_KEY, fromLink).catch(() => undefined);
      return;
    }
    AsyncStorage.getItem(TOKEN_KEY).then((saved) => {
      if (saved) {
        setToken(saved);
        setDraft(saved);
      }
    }).catch(() => undefined);
  }, [params.token]);

  useEffect(() => {
    if (!token) return;
    api<Me>('/api/farm/me', { headers: { 'x-farm-token': token } })
      .then((data) => {
        setMe(data);
        setError('');
      })
      .catch((err: Error) => {
        setMe(null);
        setError(err.message);
      });
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      api<{ foods: CatalogFood[] }>(`/api/catalog?q=${encodeURIComponent(query)}`)
        .then((data) => setFoods(data.foods))
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  async function refresh() {
    const data = await api<Me>('/api/farm/me', { headers: { 'x-farm-token': token } });
    setMe(data);
  }

  async function saveFarm(patch: Record<string, unknown>) {
    setMessage('');
    try {
      await api('/api/farm/me', { method: 'PATCH', headers: { 'x-farm-token': token }, body: JSON.stringify(patch) });
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'could not save.');
    }
  }

  async function addFood() {
    if (!picked) return;
    const cents = Math.round(Number(price) * 100);
    setMessage('');
    try {
      await api('/api/farm/products', {
        method: 'POST',
        headers: { 'x-farm-token': token },
        body: JSON.stringify({
          foodId: picked.id,
          priceCents: cents,
          unit: picked.unit,
          stockQty: Number(stock) || 0,
          varietyNames: varieties,
          note: '',
        }),
      });
      setPicked(null);
      setVarieties([]);
      setMessage(`${picked.name} is on your stand.`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'could not add that.');
    }
  }

  async function savePrice(product: Owned, dollarsText: string, stockText: string) {
    const cents = Math.round(Number(dollarsText) * 100);
    try {
      await api(`/api/farm/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'x-farm-token': token },
        body: JSON.stringify({ priceCents: cents, stockQty: Number(stockText) || 0 }),
      });
      setMessage('saved.');
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'could not save.');
    }
  }

  async function replacePhoto(product: Owned, role: string) {
    const prepared = await prepareFarmerPhoto();
    if (!prepared.ok) {
      if (prepared.reason) setMessage(prepared.reason);
      return;
    }
    try {
      const result = await api<{ accepted: boolean; reason?: string }>('/api/farm/products/' + product.id + '/photo', {
        method: 'POST',
        headers: { 'x-farm-token': token },
        body: JSON.stringify({ ...prepared, role }),
      });
      setMessage(result.accepted ? 'photo updated.' : (result.reason || 'stock photo kept.'));
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'could not upload.');
    }
  }

  return (
    <Shell top="bar" title="your stand">
      <Wrap style={{ paddingTop: desktop ? 48 : 12 }}>
        <View style={{ maxWidth: 720, alignSelf: 'center', width: '100%' }}>
          <Cap>farm dashboard</Cap>
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.ink, marginTop: 10, lineHeight: 21 }}>
            a token from mainz opens this. it is a stand-in for a magic link.
          </Text>
          <TextInput value={draft} onChangeText={setDraft} placeholder="farm token" placeholderTextColor={colors.gray} autoCapitalize="none" style={input} />
          <View style={{ marginTop: 12, maxWidth: 200 }}>
            <PrimaryButton label="open" onPress={async () => {
              const next = draft.trim();
              await AsyncStorage.setItem(TOKEN_KEY, next);
              setToken(next);
            }} />
          </View>
          {error ? <Text style={{ fontFamily: 'Inter', color: colors.red, marginTop: 12 }}>{error}</Text> : null}
          {message ? <Text style={{ fontFamily: 'Inter', color: colors.navy, marginTop: 12 }}>{message}</Text> : null}

          {me ? (
            <>
              <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '700', color: colors.navy, marginTop: 28 }}>{me.farm.name}</Text>
              <Text style={{ fontFamily: 'Inter', color: colors.gray, marginTop: 4 }}>{me.farm.status}{me.farm.active ? ' · on' : ' · off'}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <Pill label="pickup" on={me.farm.offersPickup} onPress={() => saveFarm({ offersPickup: !me.farm.offersPickup })} />
                <Pill label="delivery" on={me.farm.offersDelivery} onPress={() => saveFarm({ offersDelivery: !me.farm.offersDelivery })} />
              </View>
              <Text style={{ fontFamily: 'Inter', color: colors.gray, marginTop: 8, fontSize: 12 }}>
                pickup {me.farm.pickupSummary || '—'} · delivery {me.farm.deliverySummary || '—'}
              </Text>

              <Text style={head}>your food</Text>
              {me.products.map((product) => (
                <ProductEditor key={product.id} product={product} onSave={savePrice} onPhoto={replacePhoto} />
              ))}

              <Text style={head}>add from the catalog</Text>
              <TextInput value={query} onChangeText={setQuery} placeholder="peaches, honey, eggs" placeholderTextColor={colors.gray} style={input} />
              {foods.slice(0, 8).map((food) => (
                <Pressable key={food.id} onPress={() => { setPicked(food); setVarieties([]); }} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden' }}>
                    <FoodImage photo={food.photo} name={food.name} width={44} height={44} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter', color: colors.navy, fontWeight: picked?.id === food.id ? '700' : '500' }}>{food.name}</Text>
                    <Text style={{ fontFamily: 'Inter', color: colors.gray, fontSize: 12 }}>{food.needsLicensedPhoto ? 'stock photo coming' : 'mainz photo'}</Text>
                  </View>
                </Pressable>
              ))}
              {picked ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontFamily: 'Inter', color: colors.navy }}>adding {picked.name}</Text>
                  <TextInput value={price} onChangeText={setPrice} placeholder="price in dollars" style={input} keyboardType="decimal-pad" />
                  <TextInput value={stock} onChangeText={setStock} placeholder="how many" style={input} keyboardType="number-pad" />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {picked.varieties.map((name) => (
                      <Pill
                        key={name}
                        label={name}
                        on={varieties.includes(name)}
                        onPress={() => setVarieties((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])}
                      />
                    ))}
                  </View>
                  <View style={{ marginTop: 16, maxWidth: 220 }}>
                    <PrimaryButton label="add it" onPress={addFood} />
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </Wrap>
    </Shell>
  );
}

function ProductEditor({
  product,
  onSave,
  onPhoto,
}: {
  product: Owned;
  onSave: (product: Owned, price: string, stock: string) => void;
  onPhoto: (product: Owned, role: string) => void;
}) {
  const [price, setPrice] = useState((product.priceCents / 100).toFixed(2));
  const [stock, setStock] = useState(String(product.stockQty));
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.hair, paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden' }}>
          <FoodImage photo={product.photo} name={product.name} width={48} height={48} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Inter', fontWeight: '600', color: colors.navy }}>{product.name}</Text>
          <Text style={{ fontFamily: 'Inter', color: colors.gray, fontSize: 12 }}>{dollars(product.priceCents, 'auto')} / {product.unit}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <TextInput value={price} onChangeText={setPrice} style={[input, { flex: 1 }]} />
        <TextInput value={stock} onChangeText={setStock} style={[input, { flex: 1 }]} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        <Pill label="save price" on onPress={() => onSave(product, price, stock)} />
        {product.photos.map((photo) => (
          <Pill key={photo.role} label={`${photo.role}${photo.isStock ? '' : ' · yours'}`} onPress={() => onPhoto(product, photo.role)} />
        ))}
      </View>
    </View>
  );
}

const input = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 8, marginTop: 10 };
const head = { fontFamily: 'Inter' as const, fontSize: 13, fontWeight: '600' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: colors.navy, marginTop: 32 };
