import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Shell } from '../../../src/components/chrome';
import { Cap, FoodImage, Hair, Pill, PrimaryButton, Qty, Segment, Wrap } from '../../../src/components/ui';
import { api } from '../../../src/lib/api';
import { dollars } from '../../../src/lib/money';
import { priceGroups, type Fulfillment } from '../../../src/lib/orderMath';
import { usePreviewBag } from '../../../src/lib/previewBag';
import { colors, useLayout } from '../../../src/theme';
import { PREVIEW_PAY_LINE } from '../../../../api/src/listing';

type Quote = {
  preview?: boolean;
  payment?: null;
  merchandiseCents: number;
  deliveryFeeCents: number;
  platformFeeCents: number;
  totalCents: number;
  route?: {
    matched: boolean;
    pickupOnly: boolean;
    line: string;
    runDate?: string;
    slots?: { label: string }[];
  } | null;
  groups?: { fulfillment: string; windowLabel: string }[];
};

export default function PreviewBag() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const bag = usePreviewBag(token || '');
  const { desktop } = useLayout();
  const [quote, setQuote] = useState<Quote | null>(null);
  const local = useMemo(() => priceGroups([{
    farmId: 1,
    fulfillment: bag.fulfillment,
    windowLabel: bag.windowLabel,
    lines: bag.lines.map((line) => ({
      farmId: 1,
      productId: line.productId,
      optionId: null,
      qty: line.qty,
      unitPriceCents: line.unitPriceCents,
      name: line.name,
      optionLabel: '',
      unit: line.unit,
    })),
  }], { platformFeeBps: 500, deliveryFeeCents: 500 }), [bag.lines, bag.fulfillment, bag.windowLabel]);
  const money = quote || local;
  const slots = quote?.route?.matched ? quote.route.slots || [] : [];
  const pickupOnly = !!quote?.route?.pickupOnly;

  useEffect(() => {
    if (!token || !bag.lines.length) {
      setQuote(null);
      return undefined;
    }
    let cancel = false;
    api<Quote>(`/api/listings/${token}/preview-quote`, {
      method: 'POST',
      body: JSON.stringify({
        items: bag.lines.map((line) => ({ productId: line.productId, qty: line.qty })),
        groups: [{ fulfillment: bag.fulfillment, windowLabel: bag.windowLabel }],
        address: { line1: bag.address1, cityZip: bag.cityZip },
      }),
    }).then((next) => {
      if (!cancel) setQuote(next);
    }).catch(() => {
      if (!cancel) setQuote(null);
    });
    return () => {
      cancel = true;
    };
  }, [token, bag.lines, bag.fulfillment, bag.windowLabel, bag.address1, bag.cityZip]);

  useEffect(() => {
    if (pickupOnly && bag.fulfillment === 'delivery') bag.setFulfillment('pickup');
  }, [pickupOnly]);

  useEffect(() => {
    if (!quote?.route?.matched || bag.fulfillment !== 'delivery') return;
    const label = quote.route.slots?.[0]?.label || '';
    if (label && bag.windowLabel !== label && !quote.route.slots?.some((slot) => slot.label === bag.windowLabel)) {
      bag.setWindow(label);
    }
  }, [quote?.route?.matched, quote?.route?.runDate]);

  const delivering = bag.fulfillment === 'delivery' && !pickupOnly;

  return (
    <Shell top={desktop ? 'none' : 'bar'} title="your bag">
      <Wrap style={{ paddingTop: desktop ? 56 : 8 }}>
        <View style={{ alignItems: 'center' }}>
          {desktop ? <Cap>your bag</Cap> : null}
          <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.gray, marginTop: desktop ? 10 : 0 }}>
            {bag.lines.length === 0 ? 'nothing in here yet.' : `${bag.lines.length} thing${bag.lines.length === 1 ? '' : 's'}. one checkout.`}
          </Text>
        </View>
        {bag.lines.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 28 }}>
            <PrimaryButton label="back to the farm" onPress={() => router.push(`/listing/${token}`)} />
          </View>
        ) : (
          <View style={{ marginTop: 28, maxWidth: 460, alignSelf: 'center', width: '100%' }}>
            {bag.lines.map((line) => (
              <View key={line.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.hair }}>
                <View style={{ width: 58, height: 58, borderRadius: 29, overflow: 'hidden', backgroundColor: colors.cream }}>
                  <FoodImage photo={line.photo} name={line.name} width={58} height={58} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: colors.navy }}>{line.name}</Text>
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.gray, marginTop: 3 }}>{line.unit}</Text>
                  <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                    <Qty value={line.qty} onChange={(next) => bag.setQty(line.key, next)} />
                  </View>
                </View>
                <Text style={{ fontFamily: 'Inter', fontWeight: '600', color: colors.navy }}>{dollars(line.qty * line.unitPriceCents)}</Text>
              </View>
            ))}
            {!pickupOnly ? (
              <View style={{ marginTop: 18 }}>
                <Segment
                  track={colors.cream}
                  value={bag.fulfillment}
                  onChange={(value) => bag.setFulfillment(value as Fulfillment)}
                  options={[{ value: 'pickup', label: 'pickup' }, { value: 'delivery', label: 'delivery' }]}
                />
              </View>
            ) : null}
            {quote?.route?.line ? <Text style={note}>{quote.route.line}</Text> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {(delivering ? slots : [{ label: 'at the farm' }]).map((slot) => (
                <Pill key={slot.label} small label={slot.label} on={slot.label === bag.windowLabel || (!bag.windowLabel && slot.label === (delivering ? slots[0]?.label : 'at the farm'))} onPress={() => bag.setWindow(slot.label)} />
              ))}
            </View>
            <TextInput
              value={bag.address1}
              onChangeText={(value) => bag.setAddress(value, bag.cityZip)}
              placeholder="street"
              placeholderTextColor={colors.gray}
              accessibilityLabel="street"
              style={field}
            />
            <TextInput
              value={bag.cityZip}
              onChangeText={(value) => bag.setAddress(bag.address1, value)}
              placeholder="zip or town"
              placeholderTextColor={colors.gray}
              accessibilityLabel="zip or town"
              style={field}
            />
            <View style={{ marginTop: 22, gap: 10 }}>
              <Fee label="to the farmers" value={dollars(money.merchandiseCents)} />
              <Fee label="delivery fee" value={dollars(money.deliveryFeeCents)} />
              <Fee label="transaction fee" value={dollars(money.platformFeeCents)} />
              <Hair />
              <Fee label="total" value={dollars(money.totalCents)} strong />
            </View>
            <View style={{ marginTop: 18, height: 52, borderRadius: 999, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 13.5, fontWeight: '600', color: colors.gray }}>preview</Text>
            </View>
            <Text style={note}>{PREVIEW_PAY_LINE}</Text>
            <Pressable onPress={() => router.push(`/listing/${token}`)} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter', color: colors.gray, fontSize: 13 }}>back to the farm</Text>
            </Pressable>
          </View>
        )}
      </Wrap>
    </Shell>
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

const note = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 12 };
const field = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 10, marginTop: 12 };
