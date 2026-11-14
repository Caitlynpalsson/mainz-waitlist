import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../src/components/chrome';
import { FoodImage, PrimaryButton, Wrap } from '../src/components/ui';
import { api } from '../src/lib/api';
import { dollars } from '../src/lib/money';
import { prepareFarmerPhoto } from '../src/lib/uploadPhoto';
import type { CatalogFood, Windows } from '../src/lib/types';
import { udafType } from '../../api/src/review';
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
  needsUdaf?: boolean;
  udafOn?: boolean;
  udafLabel?: string;
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

  const schedule = !me ? '' : [
    me.farm.offersPickup && me.farm.pickupSummary ? `${me.farm.pickupSummary} pickup` : '',
    me.farm.offersDelivery && me.farm.deliverySummary ? `${me.farm.deliverySummary} delivery` : '',
  ].filter(Boolean).join(', ');
  const how = me
    ? (me.farm.offersPickup && me.farm.offersDelivery ? 'pickup and delivery' : me.farm.offersPickup ? 'pickup' : me.farm.offersDelivery ? 'delivery' : 'pickup or delivery')
    : '';

  return (
    <Shell top="bar" title="your stand">
      <Wrap style={{ paddingTop: desktop ? 56 : 20 }}>
        <View style={{ maxWidth: 420, alignSelf: 'center', width: '100%', alignItems: 'center' }}>
          {me ? (
            <>
              <Text style={farmName}>{me.farm.name.toLowerCase()}</Text>
              <Text style={statusLine}>{me.farm.status}{me.farm.active ? '' : ' · hidden'}</Text>
              <Pressable onPress={() => saveFarm({ offersPickup: !me.farm.offersPickup })}>
                <Text style={[quiet, { marginTop: 22 }]}>{how}</Text>
              </Pressable>
              <Pressable onPress={() => saveFarm({ offersDelivery: !me.farm.offersDelivery })}>
                {schedule ? <Text style={quiet}>{schedule}</Text> : null}
              </Pressable>
              <Text style={[kicker, { marginTop: 48 }]}>your food</Text>
              {me.products.map((product) => (
                <ProductEditor key={product.id} product={product} onSave={savePrice} onPhoto={replacePhoto} />
              ))}
              <Text style={[kicker, { marginTop: 36 }]}>add a food</Text>
              <TextInput value={query} onChangeText={setQuery} placeholder="peaches, honey, eggs" placeholderTextColor={colors.gray} style={input} />
              {foods.slice(0, 6).map((food) => (
                <Pressable key={food.id} onPress={() => { setPicked(food); setVarieties([]); }} style={{ paddingVertical: 8 }}>
                  <Text style={{ fontFamily: 'Inter', color: colors.navy, fontWeight: picked?.id === food.id ? '600' : '400', textAlign: 'center' }}>{food.name}</Text>
                  {udafType(`${food.name} ${food.category}`) ? <Text style={quiet}>needs UDAF check · stays off until mainz verifies it</Text> : null}
                </Pressable>
              ))}
              {picked ? (
                <View style={{ marginTop: 8, width: '100%', alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Inter', color: colors.navy }}>adding {picked.name}</Text>
                  <TextInput value={price} onChangeText={setPrice} placeholder="price in dollars" placeholderTextColor={colors.gray} style={input} keyboardType="decimal-pad" />
                  <TextInput value={stock} onChangeText={setStock} placeholder="how many" placeholderTextColor={colors.gray} style={input} keyboardType="number-pad" />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                    {picked.varieties.map((name) => (
                      <Pressable key={name} onPress={() => setVarieties((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])}>
                        <Text style={{ fontFamily: 'Inter', fontSize: 14, color: varieties.includes(name) ? colors.navy : colors.gray, fontWeight: varieties.includes(name) ? '600' : '400' }}>{name}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={{ marginTop: 18, width: '100%', maxWidth: 220 }}>
                    <PrimaryButton label="add it" onPress={addFood} />
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={quiet}>a token from mainz opens this.</Text>
              <TextInput value={draft} onChangeText={setDraft} placeholder="farm token" placeholderTextColor={colors.gray} autoCapitalize="none" autoCorrect={false} style={input} />
              <View style={{ marginTop: 18, width: '100%', maxWidth: 220 }}>
                <PrimaryButton label="open" onPress={async () => {
                  const next = draft.trim();
                  await AsyncStorage.setItem(TOKEN_KEY, next);
                  setToken(next);
                }} />
              </View>
            </>
          )}
          {error ? <Text style={[quiet, { color: colors.red, marginTop: 16 }]}>{error}</Text> : null}
          {message ? <Text style={[quiet, { color: colors.navy, marginTop: 16 }]}>{message}</Text> : null}
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
    <View style={{ alignItems: 'center', marginTop: 36, width: '100%' }}>
      <View style={frame}>
        <FoodImage photo={product.photo} name={product.name} width={168} height={168} />
      </View>
      <Text style={foodName}>{product.name}</Text>
      <Text style={quiet}>
        {dollars(product.priceCents, 'auto')} / {product.unit} · {product.stockQty} left{product.active ? '' : ' · off'}
      </Text>
      {product.needsUdaf ? (
        <Text style={[quiet, { color: colors.red }]}>
          {product.udafLabel || 'needs UDAF check'}{product.udafOn ? ' · on the shop' : ' · hidden until mainz verifies the document'}
        </Text>
      ) : null}
      <TextInput value={price} onChangeText={setPrice} placeholder="price" placeholderTextColor={colors.gray} style={input} keyboardType="decimal-pad" />
      <TextInput value={stock} onChangeText={setStock} placeholder="how many left" placeholderTextColor={colors.gray} style={input} keyboardType="number-pad" />
      <Pressable onPress={() => onSave(product, price, stock)} style={{ marginTop: 12 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.navy, fontWeight: '600' }}>save</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
        {product.photos.map((photo) => (
          <Pressable key={photo.role} onPress={() => onPhoto(product, photo.role)}>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.gray }}>{photo.role}{photo.isStock ? '' : ' · yours'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const farmName = { fontFamily: 'Inter' as const, fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.6, color: colors.navy, textAlign: 'center' as const };
const statusLine = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.peri, marginTop: 10, textAlign: 'center' as const };
const kicker = { fontFamily: 'Inter' as const, fontSize: 11, fontWeight: '600' as const, letterSpacing: 1.6, textTransform: 'uppercase' as const, color: colors.navy, textAlign: 'center' as const };
const foodName = { fontFamily: 'Inter' as const, fontSize: 16, fontWeight: '600' as const, color: colors.navy, marginTop: 14, textAlign: 'center' as const };
const quiet = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 4 };
const frame = { width: 168, height: 168, borderRadius: 22, overflow: 'hidden' as const, backgroundColor: colors.cream };
const input = { fontFamily: 'Inter' as const, fontSize: 15, color: colors.navy, textAlign: 'center' as const, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 10, marginTop: 8, width: '100%' as const };
