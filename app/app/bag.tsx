import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Shell } from '../src/components/chrome';
import { Cap, FoodImage, Hair, Pill, PrimaryButton, Qty, Segment, Wrap } from '../src/components/ui';
import { IconChevron, IconPin } from '../src/components/icons';
import { api } from '../src/lib/api';
import { dollars } from '../src/lib/money';
import { priceGroups, type Fulfillment } from '../src/lib/orderMath';
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
  });

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
        if (!cancel) setQuoteError(err.message);
      });
    return () => {
      cancel = true;
    };
  }, [signature]);

  const delivering = groups.some((group) => group.choice.fulfillment === 'delivery');
  const sameMode = groups.length > 0 && groups.every((group) => group.choice.fulfillment === groups[0].choice.fulfillment);
  const things = store.lines.length;

  async function place() {
    setFormError('');
    if (store.customerName.trim().length < 2 || !store.customerEmail.includes('@')) {
      setFormError('add your name and email so the farm knows it is you.');
      return;
    }
    setPlacing(true);
    try {
      const saved = await api<{ order: { publicId: string } }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...payload(store),
          customer: { name: store.customerName, email: store.customerEmail },
          address: { line1: store.address1, cityZip: store.cityZip },
        }),
      });
      store.clearLines();
      router.replace(`/order/${saved.order.publicId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'could not place that.');
    } finally {
      setPlacing(false);
    }
  }

  const summary = (
    <View style={desktop ? card : undefined}>
      {groups.length > 0 && sameMode ? (
        <Segment
          track={desktop ? colors.white : colors.cream}
          value={groups[0].choice.fulfillment}
          onChange={(value) => store.setAllFulfillment(value as Fulfillment)}
          options={[{ value: 'pickup', label: 'pickup' }, { value: 'delivery', label: 'delivery' }]}
        />
      ) : null}
      {delivering ? (
        <Text style={note}>or grab it saturday at the farm stand. it's free.</Text>
      ) : null}
      {delivering ? (
        <View style={address}>
          <IconPin size={18} />
          <View style={{ flex: 1 }}>
            <TextInput value={store.address1} onChangeText={(value) => store.setAddress(value, store.cityZip)} style={addr1} />
            <TextInput value={store.cityZip} onChangeText={(value) => store.setAddress(store.address1, value)} style={addr2} />
          </View>
          <IconChevron size={16} color={colors.gray} />
        </View>
      ) : null}
      <View style={{ marginTop: 22, gap: 10 }}>
        <Fee label="to the farmers" value={dollars(money.merchandiseCents)} />
        <Fee label="delivery fee" value={dollars(money.deliveryFeeCents)} />
        <Fee label="transaction fee" value={dollars(money.platformFeeCents)} />
        <Hair />
        <Fee label="total" value={dollars(money.totalCents)} strong />
      </View>
      <Field label="your name" value={store.customerName} onChange={(value) => store.setCustomer(value, store.customerEmail)} />
      <Field label="email" value={store.customerEmail} onChange={(value) => store.setCustomer(store.customerName, value)} />
      {formError ? <Text style={errText}>{formError}</Text> : null}
      {quoteError ? <Text style={errText}>{quoteError}</Text> : null}
      <View style={{ marginTop: 18 }}>
        <PrimaryButton
          label={placing ? 'placing…' : `place order · ${dollars(money.totalCents)}`}
          disabled={!things || placing}
          onPress={place}
        />
      </View>
      <Text style={[note, { marginTop: 12 }]}>place order (test, no payment).</Text>
      <Text style={note}>farmers keep their price. we add a small fee. that's it.</Text>
    </View>
  );

  return (
    <Shell nav={null} top={desktop ? 'none' : 'bar'} title="your bag">
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
                      {[group.offersDelivery ? `delivery ${group.deliverySummary}` : '', group.offersPickup ? `pickup ${group.pickupSummary}` : ''].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {group.offersPickup && group.offersDelivery ? (
                    <Segment
                      track={colors.cream}
                      value={group.choice.fulfillment}
                      onChange={(value) => store.setFulfillment(group.farmId, value as Fulfillment)}
                      options={[{ value: 'pickup', label: 'pickup' }, { value: 'delivery', label: 'delivery' }]}
                    />
                  ) : (
                    <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.ink }}>{group.choice.fulfillment} only</Text>
                  )}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {(group.choice.fulfillment === 'delivery' ? group.lines[0].windows.delivery : group.lines[0].windows.pickup).map((slot) => (
                      <Pill key={slot.label} small label={slot.label} on={slot.label === group.choice.windowLabel} onPress={() => store.setWindow(group.farmId, slot.label)} />
                    ))}
                  </View>
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
  };
}

function Fee({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: 'Inter', fontSize: strong ? 15 : 13, fontWeight: strong ? '600' : '400', color: strong ? colors.navy : colors.gray }}>{label}</Text>
      <Text style={{ fontFamily: 'Inter', fontSize: strong ? 15 : 13, fontWeight: strong ? '600' : '500', color: colors.navy }}>{value}</Text>
    </View>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={label}
      placeholderTextColor={colors.gray}
      autoCapitalize="none"
      style={{ fontFamily: 'Inter', fontSize: 14, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 8, marginTop: 8 }}
    />
  );
}

const card = { width: '100%' as const, backgroundColor: colors.cream, borderRadius: 28, padding: 28 };
const note = { fontFamily: 'Inter' as const, fontSize: 11, color: colors.gray, textAlign: 'center' as const, marginTop: 10 };
const address = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: colors.white, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginTop: 16 };
const addr1 = { fontFamily: 'Inter' as const, fontSize: 14, fontWeight: '500' as const, color: colors.navy, padding: 0 };
const addr2 = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray, padding: 0, marginTop: 2 };
const errText = { fontFamily: 'Inter' as const, color: colors.red, fontSize: 12, marginTop: 10, textAlign: 'center' as const };
