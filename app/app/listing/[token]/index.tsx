import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shell } from '../../../src/components/chrome';
import { FarmBelow } from '../../../src/components/farmBelow';
import { Cap, FarmAvatar, FoodImage, FulfillmentPills, Grid, PrimaryButton, ShopCard, Wrap, useBoxWidth } from '../../../src/components/ui';
import { api } from '../../../src/lib/api';
import { colors, useLayout } from '../../../src/theme';
import { LISTING_CONFIRM_LINE, LISTING_REMOVED_LINE, LISTING_THANKS_LINE, ONBOARDING_SMS, ONBOARDING_TEXT_US, REMOVE_REASONS, draftDisplayPrice, onboardingStep, portraitIsLogo, type OnboardingStep, type PayPref, type RemoveReason } from '../../../../api/src/listing';
import { FarmOnboarding, TextUsLine, nextOnboardingStep, prevOnboardingStep, type OnboardingAnswers } from '../../../src/components/farmOnboarding';
import { photoSource } from '../../../src/lib/photos';
import { ProductSearchField, ProductSearchIcon, SEARCH_EMPTY } from '../../../src/components/miniSearch';
import { searchProducts } from '../../../../api/src/search';
import { farmGuideFacts } from '../../../../api/src/guide';
import { SetupGuide } from '../../../src/components/SetupGuide';

type Product = { id?: number; name: string; priceCents: number; unit: string; photoKey: string; priceStatus?: string; availability?: string };
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
  profilePhoto?: string;
  pickupDays?: string;
  deliveryDay?: string;
  pickupPreview?: string[];
  pickupLine?: string;
  meetLine?: string;
  onboarding?: OnboardingAnswers & { done?: boolean };
  products: Product[];
  priceFixes?: { productId: number | null; productName: string; priceCents: number }[];
};


export default function ListingApproval() {
  const params = useLocalSearchParams<{ token: string; preview_step?: string; payout?: string; guide?: string }>();
  const token = params.token;
  const previewing = onboardingStep(params.preview_step);
  const [step, setStep] = useState<OnboardingStep | null>(previewing);
  const { desktop, shopCols, height } = useLayout();
  const gap = desktop ? 36 : 14;
  const cell = useBoxWidth(shopCols, gap);
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState(false);
  const [ask, setAsk] = useState("what's off?");
  const [off, setOff] = useState(false);
  const [down, setDown] = useState(false);
  const [downReason, setDownReason] = useState<RemoveReason | ''>('');
  const [downNote, setDownNote] = useState('');
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [bankReady, setBankReady] = useState(false);

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
      setDown(false);
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

  function openChange(prompt: string) {
    setAsk(prompt);
    setOff(true);
    setDown(false);
    setFormError('');
    setSheet(true);
  }

  function openDown() {
    setSheet(false);
    setOff(false);
    setDownReason('');
    setDownNote('');
    setFormError('');
    setDown(true);
  }

  async function startOnboarding() {
    setSheet(false);
    if (previewing) {
      setStep('welcome');
      return;
    }
    if (!token) return;
    setBusy(true);
    setFormError('');
    try {
      const next = await api<Listing>(`/api/listings/${token}/approve`, { method: 'POST' });
      take(next, false);
      setStep('welcome');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'try again.');
    } finally {
      setBusy(false);
    }
  }

  async function move(next: OnboardingStep | null, patch: Partial<OnboardingAnswers> & { done?: boolean; reachPhone?: string }) {
    const saving = !previewing && token && (patch.reachVia || patch.payPref || patch.payoutConnected != null || patch.pickupNote != null || patch.pickupOk != null || patch.done);
    if (saving) {
      setBusy(true);
      setFormError('');
      try {
        const saved = await api<Listing>(`/api/listings/${token}/onboarding`, { method: 'POST', body: JSON.stringify(patch) });
        take(saved, false);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'try again.');
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setStep(next);
  }

  async function connectBank() {
    if (previewing) {
      setFormError('open the farm page to connect a test bank.');
      return;
    }
    if (!token) return;
    setBusy(true);
    setFormError('');
    try {
      const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : '';
      const back = `${origin}/listing/${token}?payout=return`;
      const result = await api<{ url: string }>(`/api/listings/${token}/connect`, {
        method: 'POST',
        body: JSON.stringify({ returnUrl: back, refreshUrl: back }),
      });
      if (result.url) await Linking.openURL(result.url);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'could not open stripe.');
    } finally {
      setBusy(false);
    }
  }

  async function checkBank() {
    if (previewing || !token) return;
    setBusy(true);
    setFormError('');
    try {
      const status = await api<{ connected: boolean }>(`/api/listings/${token}/connect-status`);
      if (status.connected) setBankReady(true);
      else setFormError('stripe has not finished the bank step yet.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'try again.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const guide = params.guide;
    if (guide === 'profile' || guide === 'products') {
      setStep(null);
      setFilling(true);
    } else if (guide === 'photos' || guide === 'approval') {
      setStep(null);
      setFilling(false);
    } else if (guide === 'bank') {
      setStep('pay');
    }
  }, [params.guide]);

  useEffect(() => {
    if (params.payout !== 'return' || !token || previewing) return;
    setStep('pay');
    void checkBank();
  }, [params.payout, token, previewing]);

  const approved = data?.status === 'farm_approved';
  const denied = data?.status === 'farm_denied' || data?.removed === true;
  const preview = !!data && !denied && !approved && !filling;

  return (
    <Shell
      top="none"
      sticky={null}
    >
      <Wrap style={{ paddingTop: desktop ? 48 : 28 }}>
        {step ? (
          <FarmOnboarding
            step={step}
            answers={{
              reachVia: data?.onboarding?.reachVia || '',
              reachEmail: data?.onboarding?.reachEmail || '',
              payPref: (data?.onboarding?.payPref || '') as '' | PayPref,
              payoutConnected: bankReady || !!data?.onboarding?.payoutConnected,
              pickupNote: data?.onboarding?.pickupNote || '',
              pickupOk: !!data?.onboarding?.pickupOk,
            }}
            pickupLines={data?.pickupPreview || []}
            preview={!!previewing}
            busy={busy}
            error={formError}
            onBack={() => setStep(prevOnboardingStep(step))}
            onSeePage={() => setStep(null)}
            photo={data?.profilePhoto}
            onNext={(patch) => {
              const next = nextOnboardingStep(step);
              move(next, { ...patch, done: next === 'done' });
            }}
            onConnectBank={() => { void connectBank(); }}
            onCheckBank={() => { void checkBank(); }}
          />
        ) : null}
        {!step && error ? <Text style={quiet}>{error}</Text> : null}
        {!step && !data && !error ? <Text style={quiet}>loading.</Text> : null}
        {!step && data && denied ? (
          <View style={{ minHeight: Math.max(420, height - 140), alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
            <DownPortrait photo={data.profilePhoto} name={data.farmName} />
            {data.farmName ? <Text style={doneName}>{data.farmName.toLowerCase()}</Text> : null}
            <Text style={doneLine}>
              {(LISTING_REMOVED_LINE.split(ONBOARDING_TEXT_US)[0] || '').replace('letting us know 💛', 'letting\u00A0us\u00A0know\u00A0💛')}
              <Text
                accessibilityRole="link"
                onPress={() => Linking.openURL(ONBOARDING_SMS).catch(() => undefined)}
                style={smsLink}
              >
                {ONBOARDING_TEXT_US}
              </Text>
              {LISTING_REMOVED_LINE.split(ONBOARDING_TEXT_US)[1] || ''}
            </Text>
          </View>
        ) : null}
        {!step && data && !denied && approved ? (
          <View style={{ maxWidth: 460, alignSelf: 'center', width: '100%', alignItems: 'center' }}>
            <Text style={headline}>thank you.</Text>
            <Text style={{ ...storyStyle, marginTop: 16 }}>{LISTING_THANKS_LINE}</Text>
          </View>
        ) : null}
        {!step && data && !denied && !approved && filling ? (
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
        {!step && preview && data ? (
          <>
            <View style={{ marginTop: desktop ? 8 : 0, alignItems: 'center', paddingHorizontal: desktop ? 8 : 0 }}>
              <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 32, marginBottom: 10 }}>
                <View style={{ opacity: sheet || down ? 0 : 1 }} pointerEvents={sheet || down ? 'none' : 'auto'}>
                  {searchOpen ? null : <ProductSearchIcon onPress={() => setSearchOpen(true)} />}
                </View>
                <View style={{ opacity: sheet || down ? 0 : 1 }} pointerEvents={sheet || down ? 'none' : 'auto'}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="this is my farm"
                    onPress={() => { setOff(false); setDown(false); setFormError(''); setSheet(true); }}
                    style={confirmPill}
                  >
                    <Text style={confirmText}>this is my farm</Text>
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="take my page down"
                  onPress={openDown}
                  style={[quietClose, sheet || down ? { opacity: 0 } : null]}
                  pointerEvents={sheet || down ? 'none' : 'auto'}
                >
                  <Text style={quietCloseMark}>x</Text>
                </Pressable>
              </View>
              {searchOpen && !sheet && !down ? (
                <View style={{ width: '100%', maxWidth: 520, marginBottom: 18 }}>
                  <ProductSearchField
                    farmName={data.farmName}
                    value={productQuery}
                    onChange={setProductQuery}
                    onClose={() => { setSearchOpen(false); setProductQuery(''); }}
                  />
                </View>
              ) : null}
              {sheet || down ? null : (
                <View style={banner}>
                  <Text style={bannerTitle}>made with love for {data.farmName.toLowerCase()} 🌱</Text>
                  <Text style={bannerBody}>we built this page for you from your website. it's yours. tap to make it official, change anything, or take it down anytime.</Text>
                  <TextUsLine style={bannerTextUs} />
                  <View style={{ marginTop: 16, width: '100%', maxWidth: 320 }}>
                    <PrimaryButton label={busy ? 'saving…' : 'this is my farm, love it'} disabled={busy} onPress={() => startOnboarding()} />
                  </View>
                  <View style={bannerLinks}>
                    <Pressable onPress={() => openChange("what's off?")} accessibilityRole="button">
                      <Text style={bannerLink}>change something</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              <FarmAvatar photo={data.profilePhoto} name={data.farmName} size={desktop ? 96 : 72} />
              {data.location ? <Cap muted>{data.location.toLowerCase()}</Cap> : null}
              <Text style={title}>{data.farmName.toLowerCase()}</Text>
              {data.story ? <Text style={bio}>{data.story}</Text> : null}
              {data.pickupDays || data.deliveryDay ? (
                <View style={{ marginTop: 20 }}>
                  <FulfillmentPills pickup={data.pickupDays} delivery={data.deliveryDay} />
                </View>
              ) : null}
              {data.isSample ? <Text style={quiet}>sample. this farm is made up.</Text> : null}
            </View>
            <View style={{ marginTop: desktop ? 48 : 32 }}>
              <Grid cols={shopCols} gap={gap}>
                {searchProducts(data.products, productQuery).map((product) => {
                  const shown = draftDisplayPrice(product, data.priceFixes || []);
                  return (
                  <View key={product.id || product.name}>
                    <ShopCard
                      width={cell}
                      onPress={product.id ? () => router.push(`/listing/${token}/product/${product.id}`) : undefined}
                      product={{
                        id: product.id || 0,
                        name: product.name,
                        photo: product.photoKey,
                        priceCents: shown.priceCents,
                        unit: product.unit,
                        note: shown.updated ? 'updated, thanks' : (product.availability || undefined),
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
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openChange('what else do you sell?')}
                  style={{ width: cell, minHeight: Math.round(cell * 1.16), borderRadius: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.peri, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', padding: 16 }}
                >
                  <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: colors.navy, textAlign: 'center' }}>+ add more products</Text>
                </Pressable>
              </Grid>
              {productQuery && searchProducts(data.products, productQuery).length === 0 ? <Text style={{ ...quiet, marginTop: 22 }}>{SEARCH_EMPTY}</Text> : null}
              {productQuery.trim() ? null : <FarmBelow story={data.story} alreadyShown={data.story} meetLine={data.meetLine} pickupLine={data.pickupLine} town={data.location} grows={data.products.map((product) => product.name)} photo={data.profilePhoto} width={cell * shopCols} />}
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
        ask={ask}
        off={off}
        setOff={setOff}
        onClose={() => setSheet(false)}
        onConfirm={() => startOnboarding()}
        onChanges={() => send(`/api/listings/${token}/changes`, { note })}
      />
      {data && token && !denied ? (
        <SetupGuide
          audience="farm"
          accountId={token}
          facts={farmGuideFacts({
            name: data.farmName,
            town: data.location,
            story: data.story,
            photo: data.profilePhoto,
            photoIsLogo: portraitIsLogo(data.profilePhoto),
            pricedProducts: data.products.filter((product) => product.priceCents > 0).length,
            bankConnected: bankReady || !!data.onboarding?.payoutConnected,
            payByCheck: data.onboarding?.payPref === 'check',
            approvalStarted: !!data.onboarding?.done || data.status === 'sent' || data.status === 'changes_requested' || data.status === 'farm_approved',
          })}
          hrefFor={(stepId) => `/listing/${token}?guide=${stepId}`}
          onOpen={(stepId) => {
            if (stepId === 'profile' || stepId === 'products') { setStep(null); setFilling(true); }
            if (stepId === 'photos' || stepId === 'approval') { setStep(null); setFilling(false); }
            if (stepId === 'bank') setStep('pay');
          }}
        />
      ) : null}
      <DownSheet
        open={down}
        busy={busy}
        error={formError}
        reason={downReason}
        setReason={setDownReason}
        note={downNote}
        setNote={setDownNote}
        onClose={() => setDown(false)}
        onRemove={() => send(`/api/listings/${token}/deny`, { reason: downReason, note: downReason === 'other' ? downNote : '' })}
      />
    </Shell>
  );
}

function ConfirmSheet({
  open, busy, error, note, setNote, ask, off, setOff, onClose, onConfirm, onChanges,
}: {
  open: boolean;
  busy: boolean;
  error: string;
  note: string;
  setNote: (value: string) => void;
  ask: string;
  off: boolean;
  setOff: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
  onChanges: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="close" onPress={onClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,33,61,0.35)' }} />
        <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 + insets.bottom }}>
          <PrimaryButton label={busy ? 'saving…' : 'this is my farm, love it'} disabled={busy} onPress={onConfirm} />
          <Pressable onPress={() => setOff(true)} style={{ marginTop: 18, alignItems: 'center' }}>
            <Text style={sheetLink}>change something</Text>
          </Pressable>
          {off ? (
            <View style={{ width: '100%' }}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={ask || "what's off?"}
                placeholderTextColor={colors.gray}
                autoCapitalize="none"
                accessibilityLabel={ask || "what's off?"}
                style={field}
              />
              {note.trim() ? (
                <Pressable onPress={onChanges} disabled={busy} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={quiet}>send</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <Text style={hint}>a few prices are our best guess. tap any price to fix it.</Text>
          <Text style={hint}>{LISTING_CONFIRM_LINE}</Text>
          {error ? <Text style={{ ...quiet, color: colors.red, marginTop: 12 }}>{error}</Text> : null}
          <Pressable onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={quiet}>close</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DownSheet({
  open, busy, error, reason, setReason, note, setNote, onClose, onRemove,
}: {
  open: boolean;
  busy: boolean;
  error: string;
  reason: RemoveReason | '';
  setReason: (value: RemoveReason) => void;
  note: string;
  setNote: (value: string) => void;
  onClose: () => void;
  onRemove: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="keep my page" onPress={onClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,33,61,0.28)' }} />
        <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 + insets.bottom }}>
          <Text style={headline}>no worries 🌱 mind telling us why?</Text>
          <View style={reasonRow}>
            {REMOVE_REASONS.map((choice) => {
              const on = reason === choice;
              return (
                <Pressable key={choice} accessibilityRole="button" onPress={() => setReason(choice)} style={[reasonPill, on ? reasonPillOn : null]}>
                  <Text style={[reasonText, on ? reasonTextOn : null]}>{choice}</Text>
                </Pressable>
              );
            })}
          </View>
          {reason === 'other' ? (
            <TextInput
              value={note}
              onChangeText={(value) => setNote(value.slice(0, 280))}
              placeholder="a few words, if you want"
              placeholderTextColor={colors.gray}
              autoCapitalize="none"
              maxLength={280}
              accessibilityLabel="a few words, if you want"
              style={field}
            />
          ) : null}
          {reason ? (
            <View style={{ marginTop: 22, width: '100%' }}>
              <PrimaryButton label={busy ? 'saving…' : 'take my page down'} disabled={busy} onPress={onRemove} />
            </View>
          ) : null}
          <Pressable onPress={onClose} style={{ marginTop: 16, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
            <Text style={quiet}>keep my page</Text>
          </Pressable>
          {error ? <Text style={{ ...quiet, color: colors.red, marginTop: 12 }}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DownPortrait({ photo, name }: { photo?: string; name: string }) {
  const size = 96;
  const known = !!photo && photo !== 'placeholder' && !!photoSource(photo);
  if (!known) {
    return (
      <View style={{ width: size, height: size, borderRadius: 16, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 28 }}>🌱</Text>
      </View>
    );
  }
  const logo = portraitIsLogo(photo);
  return (
    <View style={{ width: size, height: size, borderRadius: logo ? 16 : size / 2, overflow: 'hidden', backgroundColor: colors.cream }}>
      <FoodImage photo={photo || ''} name={name} width={size} height={size} />
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
const title = { fontFamily: 'Inter' as const, fontWeight: '600' as const, fontSize: 26, letterSpacing: -0.4, color: colors.navy, marginTop: 12, textAlign: 'center' as const };
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
const quietClose = { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const };
const quietCloseMark = { fontFamily: 'Inter' as const, fontSize: 18, fontWeight: '500' as const, color: colors.gray };
const reasonRow = { width: '100%' as const, gap: 8, marginTop: 22 };
const reasonPill = { width: '100%' as const, minHeight: 48, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.cream, alignItems: 'center' as const, justifyContent: 'center' as const };
const doneName = { fontFamily: 'Inter' as const, fontSize: 16, fontWeight: '600' as const, color: colors.navy, textAlign: 'center' as const, marginTop: 14 };
const doneLine = { fontFamily: 'Inter' as const, fontSize: 16, lineHeight: 24, color: colors.ink, textAlign: 'center' as const, marginTop: 14, maxWidth: 340 };
const smsLink = { color: colors.navy, whiteSpace: 'nowrap' as const };
const reasonPillOn = { backgroundColor: colors.navy };
const reasonText = { fontFamily: 'Inter' as const, fontSize: 14, lineHeight: 18, color: colors.navy, textAlign: 'center' as const };
const reasonTextOn = { color: colors.white };
const banner = { width: '100%' as const, maxWidth: 520, backgroundColor: colors.cream, borderRadius: 28, paddingVertical: 22, paddingHorizontal: 18, alignItems: 'center' as const, marginBottom: 28 };
const bannerTitle = { fontFamily: 'Inter' as const, fontSize: 16, lineHeight: 22, fontWeight: '600' as const, color: colors.navy, textAlign: 'center' as const };
const bannerBody = { fontFamily: 'Inter' as const, fontSize: 14, lineHeight: 21, color: colors.ink, textAlign: 'center' as const, marginTop: 10 };
const bannerTextUs = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 12 };
const bannerLinks = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'center' as const, gap: 18, marginTop: 14 };
const bannerLink = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.gray };
const field = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, textAlign: 'center' as const, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 12, marginTop: 16, width: '100%' as const };
const priceField = { fontFamily: 'Inter' as const, fontSize: 14, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 6 };
