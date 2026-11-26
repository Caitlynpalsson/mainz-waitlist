import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Shell } from '../src/components/chrome';
import { InfoStep, WhereStep, asPickupOptions } from '../src/components/whereStep';
import { Cap, FoodImage, Hair, Pill, PrimaryButton, Qty, Segment, Wrap } from '../src/components/ui';
import { IconChevron, IconPin } from '../src/components/icons';
import { api } from '../src/lib/api';
import { dollars } from '../src/lib/money';
import { priceGroups, type Fulfillment } from '../src/lib/orderMath';
import { digitsZip, pickupCardLine, pickupChoiceLabel, shownCheckoutTotals } from '../../api/src/fulfillment';
import { isNativeShell, shopOrigin } from '../../api/src/nativeLinks';
import { openUrl } from '../src/lib/nativeShell';
import { useStore, type CartLine, type FarmChoice } from '../src/lib/store';
import type { Quote } from '../src/lib/types';
import { colors, useLayout } from '../src/theme';

export default function Bag() {
  const store = useStore();
  const { desktop } = useLayout();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [formError, setFormError] = useState('');
  const [step, setStep] = useState<'where' | 'info' | 'review'>('where');
  const [choseDelivery, setChoseDelivery] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(true);
  const appliedPickupDefault = useRef(false);
  const groups = useMemo(() => groupCart(store.lines, store.choices), [store.lines, store.choices]);
  const local = useMemo(() => priceGroups(groups.map((group) => ({
    farmId: group.farmId,
    fulfillment: group.choice.fulfillment,
    windowLabel: group.choice.windowLabel,
    lines: group.lines.map((line) => ({
      farmId: line.farmId,
      productId: line.productId,
      optionId: line.optionId,
      qty: line.qty,
      unitPriceCents: line.unitPriceCents,
      name: line.name,
      optionLabel: line.optionLabel,
      unit: line.unit,
    })),
  })), { platformFeeBps: 500, deliveryFeeCents: 500 }), [groups]);
  const money = quote || {
    merchandiseCents: local.merchandiseCents,
    deliveryFeeCents: local.deliveryFeeCents,
    platformFeeCents: local.platformFeeCents,
    totalCents: local.totalCents,
  };
  const signature = JSON.stringify({
    items: store.lines.map((line) => [line.productId, line.optionId, line.qty]),
    choices: store.choices,
    address1: store.address1,
    cityZip: store.cityZip,
  });

  const addressKey = `${store.address1}\n${store.cityZip}`;
  useEffect(() => {
    setQuote((current) => (current?.route ? { ...current, route: null } : current));
  }, [addressKey]);

  useEffect(() => {
    if (!store.lines.length) {
      setQuote(null);
      setQuoteError(null);
      return undefined;
    }
    let cancel = false;
    api<Quote>('/api/quote', { method: 'POST', body: JSON.stringify(payload(store)) })
      .then((next) => {
        if (!cancel) {
          setQuote(next);
          setQuoteError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancel) {
          setQuoteError(err.message);
          setQuote((current) => (current ? { ...current, route: null } : current));
        }
      });
    return () => {
      cancel = true;
    };
  }, [signature]);

  const hasOwnPickup = !!quote?.groups?.some((group) => (group.pickupOptions || []).length);
  const routeMatched = !!quote?.route?.matched;
  const askedDelivery = groups.some((group) => group.choice.fulfillment === 'delivery');
  const delivering = askedDelivery && routeMatched && (!hasOwnPickup || choseDelivery);
  const pickupOnly = !!quote?.route?.pickupOnly;
  const routeSlots = quote?.route?.matched ? quote.route.slots || [] : [];
  const routeKey = routeSlots.map((slot) => slot.label).join('|');
  const shown = shownCheckoutTotals(money, delivering);
  useEffect(() => {
    if (choseDelivery || appliedPickupDefault.current) return;
    if (!quote?.groups?.some((group) => (group.pickupOptions || []).length)) return;
    appliedPickupDefault.current = true;
    store.setAllFulfillment('pickup');
  }, [quote]);
  useEffect(() => {
    if (!quote?.route || quote.route.matched) return;
    if (!groups.some((group) => group.choice.fulfillment === 'delivery')) return;
    setChoseDelivery(false);
    store.setAllFulfillment('pickup');
  }, [quote?.route?.matched, quote?.route?.pickupOnly]);
  useEffect(() => {
    if (!routeSlots.length) return;
    const labels = new Set(routeSlots.map((slot) => slot.label));
    for (const group of groups) {
      if (group.choice.fulfillment === 'delivery' && !labels.has(group.choice.windowLabel)) {
        store.setWindow(group.farmId, routeSlots[0].label);
      }
    }
  }, [routeKey]);
  const sameMode = groups.length > 0 && groups.every((group) => group.choice.fulfillment === groups[0].choice.fulfillment);
  const things = store.lines.length;
  useEffect(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const publicHost = host === 'themaincoursemarket.com' || host === 'www.themaincoursemarket.com';
    if (publicHost) {
      setCheckoutOpen(false);
      return;
    }
    api<{ checkoutOpen: boolean }>('/api/config')
      .then((config) => setCheckoutOpen(config.checkoutOpen))
      .catch(() => setCheckoutOpen(true));
  }, []);
  const placeInDock = checkoutOpen && !desktop && things > 0 && (!hasOwnPickup || step === 'review');

  async function place() {
    setFormError('');
    if (store.customerName.trim().length < 2 || !store.customerEmail.includes('@')) {
      setFormError('add your name and email so the farm knows it is you.');
      return;
    }
    setPlacing(true);
    try {
      const webOrigin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://themaincoursemarket.com';
      const origin = shopOrigin(webOrigin);
      const saved = await api<{ checkoutUrl?: string; order: { publicId: string } }>('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          ...payload(store),
          customer: { name: store.customerName, email: store.customerEmail, phone: store.customerPhone },
          address: { line1: store.address1, cityZip: store.cityZip },
          returnOrigin: origin,
        }),
      });
      if (!saved.checkoutUrl) {
        setFormError('stripe did not open the test checkout.');
        return;
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && !isNativeShell()) {
        window.location.assign(saved.checkoutUrl);
        return;
      }
      await openUrl(saved.checkoutUrl);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'could not place that.');
    } finally {
      setPlacing(false);
    }
  }

  const ownOptions = asPickupOptions(quote?.groups.find((group) => (group.pickupOptions || []).length)?.pickupOptions || []);
  const ownFarm = groups.find((group) => quote?.groups?.some((item) => item.farmId === group.farmId && (item.pickupOptions || []).length));
  const summary = (
    <View style={desktop ? card : undefined}>
      {hasOwnPickup && ownFarm ? (
        step === 'where' ? (
          <WhereStep
            fulfillment={ownFarm.choice.fulfillment}
            onFulfillment={(value) => {
              setChoseDelivery(value === 'delivery');
              store.setAllFulfillment(value);
            }}
            zip={digitsZip(store.cityZip)}
            onZip={(value) => store.setAddress(store.address1, value)}
            street={store.address1}
            onStreet={(value) => store.setAddress(value, store.cityZip)}
            routeMatched={routeMatched}
            routeNote={!routeMatched ? (quote?.route?.line || '') : ''}
            options={ownOptions}
            deliverySlots={routeSlots}
            selectedLabel={ownFarm.choice.windowLabel}
            onSelect={(label) => {
              store.setFulfillment(ownFarm.farmId, 'pickup');
              store.setWindow(ownFarm.farmId, label);
            }}
            onContinue={() => setStep('info')}
          />
        ) : step === 'info' ? (
          <InfoStep
            name={store.customerName}
            email={store.customerEmail}
            phone={store.customerPhone}
            onName={(value) => store.setCustomer(value, store.customerEmail, store.customerPhone)}
            onEmail={(value) => store.setCustomer(store.customerName, value, store.customerPhone)}
            onPhone={(value) => store.setCustomer(store.customerName, store.customerEmail, value)}
            onReview={() => setStep('review')}
            onBack={() => setStep('where')}
          />
        ) : (
          <View>
            <Text style={note}>
              {ownFarm.farmName.toLowerCase()} · {delivering
                ? `delivery ${ownFarm.choice.windowLabel || 'thursday'}`
                : (ownOptions.find((option) => pickupChoiceLabel(option) === ownFarm.choice.windowLabel)
                  ? pickupCardLine(ownOptions.find((option) => pickupChoiceLabel(option) === ownFarm.choice.windowLabel)!)
                  : 'pickup')}
            </Text>
            <Money money={shown} delivering={delivering} />
            {formError ? <Text style={errText}>{formError}</Text> : null}
            {quoteError ? <Text style={errText}>{quoteError}</Text> : null}
            {checkoutOpen ? (placeInDock ? null : (
              <View style={{ marginTop: 18 }}>
                <PrimaryButton
                  label={placing ? 'placing…' : `place order · ${dollars(shown.totalCents)}`}
                  disabled={!things || placing}
                  onPress={place}
                />
              </View>
            )) : <Text style={[note, { marginTop: 18 }]}>checkout opens soon 🌱 add what you love and we'll let you know.</Text>}
            {checkoutOpen ? <Text style={[note, { marginTop: 12 }]}>stripe test checkout. the card is charged in test mode only.</Text> : null}
            <Pressable onPress={() => setStep('info')} style={{ marginTop: 8, alignItems: 'center' }}>
              <Text style={link}>back</Text>
            </Pressable>
          </View>
        )
      ) : (
        <>
          {groups.length > 0 && sameMode && routeMatched ? (
            <Segment
              track={desktop ? colors.white : colors.cream}
              value={groups[0].choice.fulfillment}
              onChange={(value) => store.setAllFulfillment(value as Fulfillment)}
              options={[{ value: 'pickup', label: 'pickup' }, { value: 'delivery', label: 'delivery' }]}
            />
          ) : null}
          {quote?.route?.line ? <Text style={note}>{quote.route.line}</Text> : null}
          {!delivering ? (
            <TextInput
              value={digitsZip(store.cityZip) || store.cityZip}
              onChangeText={(value) => store.setAddress(store.address1, value)}
              placeholder="your zip code"
              placeholderTextColor={colors.gray}
              keyboardType="number-pad"
              accessibilityLabel="your zip code"
              style={addr1}
            />
          ) : null}
          {delivering ? (
            <Text style={note}>delivery is $5 for thursday. if this route doesn't run, we'll refund the delivery fee.</Text>
          ) : null}
          {delivering ? (
            <View style={address}>
              <IconPin size={18} />
              <View style={{ flex: 1 }}>
                <TextInput
                  value={store.address1}
                  onChangeText={(value) => store.setAddress(value, store.cityZip)}
                  placeholder="street"
                  placeholderTextColor={colors.gray}
                  accessibilityLabel="street"
                  style={addr1}
                />
                <TextInput
                  value={store.cityZip}
                  onChangeText={(value) => store.setAddress(store.address1, value)}
                  placeholder="zip or town"
                  placeholderTextColor={colors.gray}
                  accessibilityLabel="zip or town"
                  style={addr2}
                />
              </View>
              <IconChevron size={16} color={colors.gray} />
            </View>
          ) : null}
          <Money money={shown} delivering={delivering} />
          <Field label="your name" value={store.customerName} onChange={(value) => store.setCustomer(value, store.customerEmail, store.customerPhone)} />
          <Field label="email" value={store.customerEmail} onChange={(value) => store.setCustomer(store.customerName, value, store.customerPhone)} />
          <Field label="phone" value={store.customerPhone} keyboardType="phone-pad" onChange={(value) => store.setCustomer(store.customerName, store.customerEmail, value)} />
          {formError ? <Text style={errText}>{formError}</Text> : null}
          {quoteError ? <Text style={errText}>{quoteError}</Text> : null}
          {checkoutOpen ? (placeInDock ? null : (
            <View style={{ marginTop: 18 }}>
              <PrimaryButton
                label={placing ? 'placing…' : `place order · ${dollars(shown.totalCents)}`}
                disabled={!things || placing}
                onPress={place}
              />
            </View>
          )) : <Text style={[note, { marginTop: 18 }]}>checkout opens soon 🌱 add what you love and we'll let you know.</Text>}
          {checkoutOpen ? <Text style={[note, { marginTop: 12 }]}>stripe test checkout. the card is charged in test mode only.</Text> : null}
          <Text style={note}>farmers keep their price. we add a small fee. that's it.</Text>
        </>
      )}
    </View>
  );

  return (
    <Shell
      nav={null}
      tab="bag"
      showTabs={!desktop}
      mark
      top={desktop ? 'none' : 'bar'}
      title="your bag"
      dock={placeInDock ? (
        <PrimaryButton
          label={placing ? 'placing…' : `place order · ${dollars(shown.totalCents)}`}
          disabled={!things || placing}
          onPress={place}
        />
      ) : null}
    >
      <Wrap style={{ paddingTop: desktop ? 56 : 8 }}>
        <View style={{ alignItems: 'center' }}>
          {desktop ? <Cap>your bag</Cap> : null}
          <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.gray, marginTop: desktop ? 10 : 0 }}>
            {things === 0 ? 'nothing in here yet.' : `${things} thing${things === 1 ? '' : 's'} from ${groups.length} farm${groups.length === 1 ? '' : 's'}. one checkout.`}
          </Text>
        </View>
        {things === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 28 }}>
            <PrimaryButton label="browse" onPress={() => router.push('/')} />
          </View>
        ) : (
          <View style={{ marginTop: desktop ? 48 : 24, flexDirection: desktop ? 'row' : 'column', gap: desktop ? 56 : 28, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, width: '100%' }}>
              {groups.map((group) => (
                <View key={group.farmId} style={{ marginBottom: 28 }}>
                  <View style={{ flexDirection: desktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: desktop ? 'baseline' : 'flex-start', gap: 4, marginBottom: 10 }}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: colors.gray }}>
                      {group.farmName.toLowerCase()} · {group.farmCity.toLowerCase()}
                    </Text>
                    <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.gray }}>
                      {[
                        quote?.route?.matched && group.offersDelivery ? `delivery ${(quote.route.slots?.[0]?.label || '').split(',')[0]}` : '',
                        group.offersPickup ? `pickup ${group.pickupSummary}` : '',
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {!hasOwnPickup && !sameMode && group.offersPickup && group.offersDelivery && routeMatched ? (
                    <Segment
                      track={colors.cream}
                      value={group.choice.fulfillment}
                      onChange={(value) => store.setFulfillment(group.farmId, value as Fulfillment)}
                      options={[{ value: 'pickup', label: 'pickup' }, { value: 'delivery', label: 'delivery' }]}
                    />
                  ) : !hasOwnPickup && (pickupOnly || !group.offersPickup || !group.offersDelivery) ? (
                    <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.ink }}>{pickupOnly ? 'pickup only' : `${group.choice.fulfillment} only`}</Text>
                  ) : null}
                  {hasOwnPickup ? null : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {(group.choice.fulfillment === 'delivery' ? routeSlots : group.lines[0].windows.pickup).map((slot) => (
                        <Pill key={slot.label} small label={slot.label} on={slot.label === group.choice.windowLabel} onPress={() => store.setWindow(group.farmId, slot.label)} />
                      ))}
                    </View>
                  )}
                  {group.lines.map((line) => (
                    <View key={line.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.hair, marginTop: 12 }}>
                      <View style={{ width: 58, height: 58, borderRadius: 29, overflow: 'hidden', backgroundColor: colors.cream }}>
                        <FoodImage photo={line.photo} name={line.name} width={58} height={58} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: colors.navy }}>{line.name}</Text>
                        <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.gray, marginTop: 3 }}>
                          {[line.optionLabel || line.unit, line.note].filter(Boolean).join(' · ')}
                        </Text>
                        {!desktop ? <View style={{ marginTop: 8, alignSelf: 'flex-start' }}><Qty value={line.qty} onChange={(next) => store.setQty(line.key, next)} /></View> : null}
                      </View>
                      {desktop ? <Qty value={line.qty} onChange={(next) => store.setQty(line.key, next)} /> : null}
                      <Text style={{ fontFamily: 'Inter', width: 72, textAlign: 'right', fontWeight: '600', color: colors.navy }}>{dollars(line.qty * line.unitPriceCents)}</Text>
                    </View>
                  ))}
                  <Hair />
                </View>
              ))}
              <Pressable onPress={() => router.push('/')}><Text style={{ fontFamily: 'Inter', color: colors.gray, marginTop: 8 }}>keep shopping →</Text></Pressable>
            </View>
            <View style={{ width: desktop ? 400 : '100%' }}>{summary}</View>
          </View>
        )}
      </Wrap>
    </Shell>
  );
}

function groupCart(lines: CartLine[], choices: Record<string, FarmChoice>) {
  const order: number[] = [];
  const map = new Map<number, CartLine[]>();
  for (const line of lines) {
    if (!map.has(line.farmId)) {
      map.set(line.farmId, []);
      order.push(line.farmId);
    }
    map.get(line.farmId)!.push(line);
  }
  return order.map((farmId) => {
    const farmLines = map.get(farmId)!;
    const fallback: FarmChoice = {
      fulfillment: farmLines[0].offersDelivery ? 'delivery' : 'pickup',
      windowLabel: '',
    };
    return {
      farmId,
      farmName: farmLines[0].farmName,
      farmCity: farmLines[0].farmCity,
      offersPickup: farmLines[0].offersPickup,
      offersDelivery: farmLines[0].offersDelivery,
      pickupSummary: farmLines[0].pickupSummary,
      deliverySummary: farmLines[0].deliverySummary,
      lines: farmLines,
      choice: choices[String(farmId)] || fallback,
    };
  });
}

function payload(store: ReturnType<typeof useStore>) {
  return {
    items: store.lines.map((line) => ({ productId: line.productId, optionId: line.optionId, qty: line.qty })),
    groups: Object.entries(store.choices).map(([farmId, choice]) => ({
      farmId: Number(farmId),
      fulfillment: choice.fulfillment,
      windowLabel: choice.windowLabel,
    })),
    address: { line1: store.address1, cityZip: store.cityZip },
  };
}

function Money({ money, delivering }: { money: { merchandiseCents: number; deliveryFeeCents: number; platformFeeCents: number; totalCents: number }; delivering: boolean }) {
  const [why, setWhy] = useState(false);
  return (
    <View style={{ marginTop: 22, gap: 10 }}>
      <Fee label="to the farmers" value={dollars(money.merchandiseCents)} />
      {delivering ? <Fee label="delivery fee" value={dollars(money.deliveryFeeCents)} /> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="what is the service fee" onPress={() => setWhy((open) => !open)}>
        <Fee label="service fee" value={dollars(money.platformFeeCents)} />
      </Pressable>
      {why ? <Text style={{ fontFamily: 'Inter', fontSize: 13, lineHeight: 18, color: colors.gray }}>shoppers pay the 5% and delivery. your rep's 3% comes from our cut, not yours.</Text> : null}
      <Hair />
      <Fee label="total" value={dollars(money.totalCents)} strong />
    </View>
  );
}

function Fee({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: 'Inter', fontSize: strong ? 15 : 13, fontWeight: strong ? '600' : '400', color: strong ? colors.navy : colors.gray }}>{label}</Text>
      <Text style={{ fontFamily: 'Inter', fontSize: strong ? 15 : 13, fontWeight: strong ? '600' : '500', color: colors.navy }}>{value}</Text>
    </View>
  );
}

function Field({ label, value, onChange, keyboardType }: { label: string; value: string; onChange: (value: string) => void; keyboardType?: 'default' | 'phone-pad' | 'email-address' }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={label}
      placeholderTextColor={colors.gray}
      autoCapitalize="none"
      keyboardType={keyboardType}
      style={{ fontFamily: 'Inter', fontSize: 14, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 8, marginTop: 8 }}
    />
  );
}

const card = { width: '100%' as const, backgroundColor: colors.cream, borderRadius: 28, padding: 28 };
const note = { fontFamily: 'Inter' as const, fontSize: 11, color: colors.gray, textAlign: 'center' as const, marginTop: 10 };
const address = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: colors.white, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginTop: 16 };
const addr1 = { fontFamily: 'Inter' as const, fontSize: 14, fontWeight: '500' as const, color: colors.navy, padding: 0 };
const addr2 = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray, padding: 0, marginTop: 2 };
const errText = { fontFamily: 'Inter' as const, color: colors.gray, fontSize: 13, marginTop: 10, textAlign: 'center' as const };
const link = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.gray };
