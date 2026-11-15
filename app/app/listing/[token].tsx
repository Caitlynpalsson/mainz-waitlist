import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/components/chrome';
import { FoodImage, PrimaryButton, Wrap } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { dollars } from '../../src/lib/money';
import { colors, useLayout } from '../../src/theme';
import { LISTING_REMOVED_LINE } from '../../../api/src/listing';

type Product = { id?: number; name: string; priceCents: number; unit: string; photoKey: string; priceStatus?: string };
type Food = { id: number; name: string; unit: string; photo: string };
type Listing = {
  farmName: string;
  farmerNames: string;
  story: string;
  location: string;
  status: string;
  changeNote: string;
  approvedAt: string;
  isSample: boolean;
  needsForm: boolean;
  removed?: boolean;
  products: Product[];
};

const thanks = "thank you. we're so happy to have you. when your first order comes in, we'll send it straight to you and set up how you'd like to get paid. no rush, no pressure.";

export default function ListingApproval() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { desktop } = useLayout();
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [denyNote, setDenyNote] = useState('');
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [filling, setFilling] = useState(false);
  const [opened, setOpened] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [farmerNames, setFarmerNames] = useState('');
  const [town, setTown] = useState('');
  const [story, setStory] = useState('');
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [draftPrice, setDraftPrice] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);

  function take(next: Listing, first: boolean) {
    setData(next);
    if (first) {
      setFarmName(next.farmName);
      setFarmerNames(next.farmerNames);
      setTown(next.location);
      setStory(next.story);
      setFilling(next.needsForm && next.status !== 'farm_approved' && next.status !== 'farm_denied');
      setOpened(true);
    }
  }

  useEffect(() => {
    if (!token) return;
    api<Listing>(`/api/listings/${token}`)
      .then((next) => take(next, !opened))
      .catch((err: Error) => setError(err.message));
  }, [token]);

  useEffect(() => {
    if (!filling) return undefined;
    const handle = setTimeout(() => {
      api<{ foods: Food[] }>(`/api/catalog?q=${encodeURIComponent(query)}`)
        .then((next) => setFoods(next.foods))
        .catch(() => setFoods([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [query, filling]);

  async function send(path: string, body?: unknown) {
    if (!token) return;
    setBusy(true);
    setFormError('');
    try {
      const next = await api<Listing>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      take(next, false);
      setNote('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'try again.');
    } finally {
      setBusy(false);
    }
  }

  async function save(products: Product[]) {
    if (!token || !farmName.trim()) return;
    setFormError('');
    try {
      const next = await api<Listing>(`/api/listings/${token}`, {
        method: 'PATCH',
        body: JSON.stringify({
          farmName,
          farmerNames,
          location: town,
          story,
          products: products.map((product) => ({
            name: product.name,
            unit: product.unit,
            priceCents: product.priceCents,
            photoKey: product.photoKey,
          })),
        }),
      });
      take(next, false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'could not save.');
    }
  }

  function addPicked() {
    if (!picked || !data) return;
    const cents = Math.round(Number(draftPrice) * 100);
    if (!Number.isFinite(cents) || cents < 50) {
      setFormError('add a price.');
      return;
    }
    const products = [...data.products, { name: picked.name, unit: picked.unit, priceCents: cents, photoKey: picked.photo || 'placeholder' }];
    setPicked(null);
    setDraftPrice('');
    setQuery('');
    save(products);
  }

  const approved = data?.status === 'farm_approved';
  const denied = data?.status === 'farm_denied' || data?.removed === true;

  return (
    <Shell top="bar" title="your listing">
      <Wrap style={{ paddingTop: desktop ? 56 : 20 }}>
        <View style={{ maxWidth: 420, alignSelf: 'center', width: '100%', alignItems: 'center' }}>
          {error ? <Text style={quiet}>{error}</Text> : null}
          {!data && !error ? <Text style={quiet}>loading.</Text> : null}
          {data && denied ? <Text style={storyStyle}>{LISTING_REMOVED_LINE}</Text> : null}
          {data && !denied && approved ? (
            <>
              <Text style={headline}>thank you.</Text>
              <Text style={{ ...storyStyle, marginTop: 16 }}>{thanks}</Text>
              <NoteBox note={note} setNote={setNote} busy={busy} error={formError} onSend={() => send(`/api/listings/${token}/changes`, { note })} />
            </>
          ) : null}
          {data && !denied && !approved && filling ? (
            <>
              <Text style={headline}>tell us about your farm</Text>
              <Text style={{ ...quiet, marginTop: 12 }}>a few lines. then you can approve the page.</Text>
              <Field label="farm name" value={farmName} onChange={setFarmName} onBlur={() => save(data.products)} />
              <Field label="your name" value={farmerNames} onChange={setFarmerNames} onBlur={() => save(data.products)} />
              <Field label="town" value={town} onChange={setTown} onBlur={() => save(data.products)} />
              <Field label="one line about the farm" value={story} onChange={setStory} onBlur={() => save(data.products)} />
              {data.products.map((product, index) => (
                <View key={`${product.name}-${index}`} style={{ alignItems: 'center', marginTop: 22 }}>
                  <Text style={productName}>{product.name}</Text>
                  <Text style={quiet}>{product.priceCents ? `${dollars(product.priceCents, 'auto')} / ${product.unit}` : product.unit}</Text>
                  <Pressable onPress={() => save(data.products.filter((_, i) => i !== index))} style={{ marginTop: 8, padding: 8 }}>
                    <Text style={quiet}>remove</Text>
                  </Pressable>
                </View>
              ))}
              <Field label="search foods" value={query} onChange={setQuery} />
              {foods.slice(0, 6).map((food) => (
                <Pressable key={food.id} onPress={() => { setPicked(food); setDraftPrice(''); }} style={{ paddingVertical: 8 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, color: picked?.id === food.id ? colors.navy : colors.gray, fontWeight: picked?.id === food.id ? '600' : '400' }}>{food.name}</Text>
                </Pressable>
              ))}
              {picked ? (
                <View style={{ width: '100%', alignItems: 'center' }}>
                  <Text style={{ ...quiet, marginTop: 8 }}>{picked.name} · {picked.unit}</Text>
                  <Field label="price in dollars" value={draftPrice} onChange={setDraftPrice} />
                  <Pressable onPress={addPicked} style={{ marginTop: 12, padding: 10 }}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: colors.navy }}>add {picked.name}</Text>
                  </Pressable>
                </View>
              ) : null}
              {formError ? <Text style={{ ...quiet, color: colors.red, marginTop: 12 }}>{formError}</Text> : null}
              {data.products.length ? (
                <View style={{ marginTop: 28, width: '100%' }}>
                  <PrimaryButton label="see my listing" onPress={() => setFilling(false)} />
                </View>
              ) : null}
            </>
          ) : null}
          {data && !denied && !approved && !filling ? (
            <>
              {data.isSample ? <Text style={quiet}>sample. this farm is made up.</Text> : null}
              <Text style={headline}>your mainz listing</Text>
              <Text style={{ ...quiet, marginTop: 12 }}>take a look and approve it so you're ready when orders open.</Text>
              <Text style={farm}>{data.farmName.toLowerCase()}</Text>
              {data.location ? <Text style={quiet}>{data.location.toLowerCase()}</Text> : null}
              {data.story ? <Text style={{ ...storyStyle, marginTop: 16 }}>{data.story}</Text> : null}
              <View style={{ marginTop: 32, width: '100%', alignItems: 'center' }}>
                {data.products.map((product) => (
                  <View key={product.id || product.name} style={{ alignItems: 'center', marginBottom: 32 }}>
                    <View style={frame}>
                      <FoodImage photo={product.photoKey} name={product.name} width={168} height={168} />
                    </View>
                    <Text style={productName}>{product.name}</Text>
                    <Text style={quiet}>{product.priceCents ? `${dollars(product.priceCents, 'auto')} / ${product.unit}` : 'price to come'}</Text>
                    {product.priceStatus === 'converted' || product.priceStatus === 'suggested' ? (
                      <Text style={quiet}>suggested price. tell us if it's different.</Text>
                    ) : null}
                  </View>
                ))}
              </View>
              <Text style={{ ...quiet, marginBottom: 16 }}>orders open at launch. you are not taking orders yet.</Text>
              <View style={{ width: '100%' }}>
                <PrimaryButton label={busy ? 'saving…' : 'approve my listing'} disabled={busy} onPress={() => send(`/api/listings/${token}/approve`)} />
              </View>
              <Pressable onPress={() => setRemoving(true)} style={{ marginTop: 18, padding: 10 }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.gray }}>no thanks, remove my page</Text>
              </Pressable>
              {removing ? (
                <View style={{ width: '100%', alignItems: 'center' }}>
                  <TextInput
                    value={denyNote}
                    onChangeText={setDenyNote}
                    placeholder="anything you'd like us to know?"
                    placeholderTextColor={colors.gray}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="anything you'd like us to know?"
                    style={field}
                  />
                  <Pressable onPress={() => send(`/api/listings/${token}/deny`, { note: denyNote })} disabled={busy} style={{ marginTop: 12, padding: 8 }}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.navy }}>{busy ? 'saving…' : 'remove my page'}</Text>
                  </Pressable>
                </View>
              ) : null}
              <NoteBox note={note} setNote={setNote} busy={busy} error={removing ? '' : formError} onSend={() => send(`/api/listings/${token}/changes`, { note })} />
              {removing && formError ? <Text style={{ ...quiet, color: colors.red, marginTop: 8 }}>{formError}</Text> : null}
            </>
          ) : null}
        </View>
      </Wrap>
    </Shell>
  );
}

function NoteBox({ note, setNote, busy, error, onSend }: { note: string; setNote: (value: string) => void; busy: boolean; error: string; onSend: () => void }) {
  return (
    <View style={{ width: '100%', alignItems: 'center', marginTop: 28 }}>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="ask for changes"
        placeholderTextColor={colors.gray}
        style={field}
      />
      {note.trim() ? (
        <Pressable onPress={onSend} disabled={busy} style={{ marginTop: 10, padding: 8 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.gray }}>send note</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={{ ...quiet, color: colors.red, marginTop: 8 }}>{error}</Text> : null}
    </View>
  );
}

function Field({ label, value, onChange, onBlur }: { label: string; value: string; onChange: (value: string) => void; onBlur?: () => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      placeholder={label}
      placeholderTextColor={colors.gray}
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel={label}
      style={field}
    />
  );
}

const headline = { fontFamily: 'Inter' as const, fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.6, lineHeight: 34, color: colors.navy, textAlign: 'center' as const };
const farm = { fontFamily: 'Inter' as const, fontSize: 22, fontWeight: '600' as const, color: colors.navy, textAlign: 'center' as const, marginTop: 28 };
const storyStyle = { fontFamily: 'Inter' as const, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center' as const };
const productName = { fontFamily: 'Inter' as const, fontSize: 16, fontWeight: '600' as const, color: colors.navy, marginTop: 12, textAlign: 'center' as const };
const quiet = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const };
const frame = { width: 168, height: 168, borderRadius: 22, overflow: 'hidden' as const, backgroundColor: colors.cream };
const field = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, textAlign: 'center' as const, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 12, marginTop: 16, width: '100%' as const };
