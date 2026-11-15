import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shell } from '../../src/components/chrome';
import { Cap, Grid, PrimaryButton, ShopCard, Wrap, useBoxWidth } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { colors, useLayout } from '../../src/theme';
import { LISTING_REMOVED_LINE, draftDisplayPrice } from '../../../api/src/listing';

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
  priceFixes?: { productId: number | null; productName: string; priceCents: number }[];
};

const thanks = "thank you. we're so happy to have you. when your first order comes in, we'll send it straight to you and set up how you'd like to get paid. no rush, no pressure.";

export default function ListingApproval() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { desktop, shopCols } = useLayout();
  const gap = desktop ? 36 : 14;
  const cell = useBoxWidth(shopCols, gap);
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [denyNote, setDenyNote] = useState('');
  const [sheet, setSheet] = useState(false);
  const [off, setOff] = useState(false);
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
  const [editing, setEditing] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');

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
      setSheet(false);
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

  async function sendPrice(product: Product) {
    if (!token) return;
    setBusy(true);
    setFormError('');
    try {
      const next = await api<Listing>(`/api/listings/${token}/price`, {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, productName: product.name, price: editPrice }),
      });
      take(next, false);
      setEditing(null);
      setEditPrice('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'add a price.');
    } finally {
      setBusy(false);
    }
  }

  const approved = data?.status === 'farm_approved';
  const denied = data?.status === 'farm_denied' || data?.removed === true;
  const preview = !!data && !denied && !approved && !filling;

  return (
    <Shell
      top="none"
      sticky={preview ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="confirm"
          onPress={() => { setSheet(true); setFormError(''); }}
          style={confirmPill}
        >
          <Text style={confirmText}>confirm</Text>
        </Pressable>
      ) : null}
    >
      <Wrap style={{ paddingTop: desktop ? 48 : 28 }}>
        {error ? <Text style={quiet}>{error}</Text> : null}
        {!data && !error ? <Text style={quiet}>loading.</Text> : null}
        {data && denied ? <Text style={storyStyle}>{LISTING_REMOVED_LINE}</Text> : null}
        {data && !denied && approved ? (
          <View style={{ maxWidth: 460, alignSelf: 'center', width: '100%', alignItems: 'center' }}>
            <Text style={headline}>thank you.</Text>
            <Text style={{ ...storyStyle, marginTop: 16 }}>{thanks}</Text>
          </View>
        ) : null}
        {data && !denied && !approved && filling ? (
          <View style={{ maxWidth: 420, alignSelf: 'center', width: '100%', alignItems: 'center' }}>
            <Text style={headline}>tell us about your farm</Text>
            <Text style={{ ...quiet, marginTop: 12 }}>a few lines. then you can approve the page.</Text>
            <Field label="farm name" value={farmName} onChange={setFarmName} onBlur={() => save(data.products)} />
            <Field label="your name" value={farmerNames} onChange={setFarmerNames} onBlur={() => save(data.products)} />
            <Field label="town" value={town} onChange={setTown} onBlur={() => save(data.products)} />
            <Field label="one line about the farm" value={story} onChange={setStory} onBlur={() => save(data.products)} />
            {data.products.map((product, index) => (
              <View key={`${product.name}-${index}`} style={{ alignItems: 'center', marginTop: 22 }}>
                <Text style={productName}>{product.name}</Text>
                <Text style={quiet}>{product.priceCents ? `${(product.priceCents / 100).toFixed(2)} / ${product.unit}` : product.unit}</Text>
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
          </View>
        ) : null}
        {preview && data ? (
          <>
            <View style={{ marginTop: desktop ? 28 : 12, alignItems: 'center', paddingHorizontal: desktop ? 20 : 0 }}>
              {data.location ? <Cap muted>{data.location.toLowerCase()}</Cap> : null}
              <Text style={title}>{data.farmName}</Text>
              {data.story ? <Text style={bio}>{data.story}</Text> : null}
              {data.isSample ? <Text style={quiet}>sample. this farm is made up.</Text> : null}
            </View>
            <View style={{ marginTop: desktop ? 48 : 32 }}>
              <Grid cols={shopCols} gap={gap}>
                {data.products.map((product) => {
                  const shown = draftDisplayPrice(product, data.priceFixes || []);
                  return (
                  <View key={product.id || product.name}>
                    <ShopCard
                      width={cell}
                      product={{
                        id: product.id || 0,
                        name: product.name,
                        photo: product.photoKey,
                        priceCents: shown.priceCents,
                        unit: product.unit,
                        note: shown.updated ? 'updated, thanks' : undefined,
                      }}
                      onPricePress={() => {
                        setEditing(product.id || 0);
                        setEditPrice(shown.priceCents ? (shown.priceCents / 100).toFixed(2) : '');
                        setFormError('');
                      }}
                    />
                    {editing === (product.id || 0) ? (
                      <View style={{ marginTop: 8 }}>
                        <TextInput
                          value={editPrice}
                          onChangeText={setEditPrice}
                          placeholder="price in dollars"
                          placeholderTextColor={colors.gray}
                          keyboardType="decimal-pad"
                          accessibilityLabel={`new price for ${product.name}`}
                          style={priceField}
                        />
                        <Pressable onPress={() => sendPrice(product)} disabled={busy} style={{ marginTop: 8 }}>
                          <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.navy }}>{busy ? 'saving…' : 'send'}</Text>
                        </Pressable>
                        {formError ? <Text style={{ ...quiet, color: colors.red }}>{formError}</Text> : null}
                      </View>
                    ) : null}
                  </View>
                  );
                })}
              </Grid>
            </View>
          </>
        ) : null}
      </Wrap>
      <ConfirmSheet
        open={sheet}
        busy={busy}
        error={formError}
        note={note}
        setNote={setNote}
        off={off}
        setOff={setOff}
        removing={removing}
        setRemoving={setRemoving}
        denyNote={denyNote}
        setDenyNote={setDenyNote}
        onClose={() => setSheet(false)}
        onConfirm={() => send(`/api/listings/${token}/approve`)}
        onChanges={() => send(`/api/listings/${token}/changes`, { note })}
        onDeny={() => send(`/api/listings/${token}/deny`, { note: denyNote })}
      />
    </Shell>
  );
}

function ConfirmSheet({
  open, busy, error, note, setNote, off, setOff, removing, setRemoving, denyNote, setDenyNote, onClose, onConfirm, onChanges, onDeny,
}: {
  open: boolean;
  busy: boolean;
  error: string;
  note: string;
  setNote: (value: string) => void;
  off: boolean;
  setOff: (value: boolean) => void;
  removing: boolean;
  setRemoving: (value: boolean) => void;
  denyNote: string;
  setDenyNote: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onChanges: () => void;
  onDeny: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="close" onPress={onClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,33,61,0.35)' }} />
        <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 + insets.bottom }}>
          <PrimaryButton label={busy ? 'saving…' : 'confirm my farm'} disabled={busy} onPress={onConfirm} />
          <Pressable onPress={() => setOff(true)} style={{ marginTop: 18, alignItems: 'center' }}>
            <Text style={sheetLink}>something's off</Text>
          </Pressable>
          {off ? (
            <View style={{ width: '100%' }}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="what's off?"
                placeholderTextColor={colors.gray}
                autoCapitalize="none"
                accessibilityLabel="what's off?"
                style={field}
              />
              {note.trim() ? (
                <Pressable onPress={onChanges} disabled={busy} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={quiet}>send</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <Pressable onPress={() => setRemoving(true)} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={quiet}>no thanks, remove my page</Text>
          </Pressable>
          {removing ? (
            <View style={{ width: '100%' }}>
              <TextInput
                value={denyNote}
                onChangeText={setDenyNote}
                placeholder="anything you'd like us to know?"
                placeholderTextColor={colors.gray}
                autoCapitalize="none"
                accessibilityLabel="anything you'd like us to know?"
                style={field}
              />
              <Pressable onPress={onDeny} disabled={busy} style={{ marginTop: 10, alignItems: 'center' }}>
                <Text style={sheetLink}>{busy ? 'saving…' : 'remove my page'}</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={hint}>a few prices are our best guess. tap any price to fix it.</Text>
          <Text style={hint}>your page goes live for shoppers when mainz launches.</Text>
          {error ? <Text style={{ ...quiet, color: colors.red, marginTop: 12 }}>{error}</Text> : null}
          <Pressable onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={quiet}>close</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
const title = { fontFamily: 'Inter' as const, fontWeight: '800' as const, fontSize: 26, letterSpacing: -1, textTransform: 'uppercase' as const, color: colors.navy, marginTop: 12, textAlign: 'center' as const };
const bio = { fontFamily: 'Inter' as const, fontSize: 14, lineHeight: 22, color: colors.ink, textAlign: 'center' as const, marginTop: 12 };
const storyStyle = { fontFamily: 'Inter' as const, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center' as const };
const productName = { fontFamily: 'Inter' as const, fontSize: 16, fontWeight: '600' as const, color: colors.navy, marginTop: 12, textAlign: 'center' as const };
const quiet = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const };
const hint = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 16 };
const sheetLink = { fontFamily: 'Inter' as const, fontSize: 14, fontWeight: '600' as const, color: colors.navy };
const confirmPill = {
  height: 32,
  paddingHorizontal: 14,
  borderRadius: 999,
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: colors.hair,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  shadowColor: '#14213D',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
};
const confirmText = { fontFamily: 'Inter' as const, fontSize: 12, fontWeight: '600' as const, color: colors.navy };
const field = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, textAlign: 'center' as const, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 12, marginTop: 16, width: '100%' as const };
const priceField = { fontFamily: 'Inter' as const, fontSize: 14, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 6 };
