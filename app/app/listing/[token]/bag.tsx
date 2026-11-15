import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Shell } from '../../../src/components/chrome';
import { InfoStep, WhereStep, asPickupOptions } from '../../../src/components/whereStep';
import { Cap, FoodImage, Hair, PrimaryButton, Qty, Wrap } from '../../../src/components/ui';
import { api } from '../../../src/lib/api';
import { dollars } from '../../../src/lib/money';
import { priceGroups } from '../../../src/lib/orderMath';
import { usePreviewBag } from '../../../src/lib/previewBag';
import { colors, useLayout } from '../../../src/theme';
import { PREVIEW_PAY_LINE } from '../../../../api/src/listing';
import { pickupCardLine, pickupChoiceLabel, showDeliveryFee, shownCheckoutTotals, type PickupOption } from '../../../../api/src/fulfillment';

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
  groups?: {
    fulfillment: string;
    windowLabel: string;
    pickupOptions?: PickupOption[];
    windows?: { pickup: { label: string }[]; delivery: { label: string }[] };
  }[];
};

export default function PreviewBag() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const bag = usePreviewBag(token || '');
  const { desktop } = useLayout();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [step, setStep] = useState<'where' | 'info' | 'review'>('where');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
  const quoted = quote || local;
  const routeMatched = !!quote?.route?.matched;
  const delivering = showDeliveryFee(bag.fulfillment, routeMatched);
  const money = shownCheckoutTotals(quoted, delivering);
  const options = asPickupOptions(quote?.groups?.[0]?.pickupOptions || []);
  const selected = options.find((option) => pickupChoiceLabel(option) === bag.windowLabel);
  const slots = quote?.route?.matched ? quote.route.slots || [] : [];

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
    if (!quote?.route || quote.route.matched || bag.fulfillment !== 'delivery') return;
    bag.setFulfillment('pickup');
  }, [quote?.route?.matched, quote?.route?.pickupOnly]);

  useEffect(() => {
    if (!delivering) return;
    const label = slots[0]?.label || '';
    if (label && !slots.some((slot) => slot.label === bag.windowLabel)) bag.setWindow(label);
  }, [delivering, quote?.route?.runDate]);

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
            {step === 'where' ? (
              <WhereStep
                fulfillment={bag.fulfillment}
                onFulfillment={(value) => bag.setFulfillment(value)}
                zip={bag.cityZip}
                onZip={(value) => bag.setAddress(bag.address1, value)}
                street={bag.address1}
                onStreet={(value) => bag.setAddress(value, bag.cityZip)}
                routeMatched={routeMatched}
                routeNote={quote?.route?.line || ''}
                options={options}
                deliverySlots={slots}
                selectedLabel={bag.windowLabel}
                onSelect={(label) => bag.setWindow(label)}
                onContinue={() => setStep('info')}
              />
            ) : null}
            {step === 'info' ? (
              <InfoStep
                name={name}
                email={email}
                phone={phone}
                onName={setName}
                onEmail={setEmail}
                onPhone={setPhone}
                onReview={() => setStep('review')}
                onBack={() => setStep('where')}
              />
            ) : null}
            {step === 'review' ? (
              <View style={{ marginTop: 22 }}>
                <Text style={note}>
                  {delivering
                    ? `delivery ${bag.windowLabel || slots[0]?.label || ''}`.trim()
                    : (selected ? pickupCardLine(selected) : 'pickup')}
                </Text>
                <View style={{ marginTop: 22, gap: 10 }}>
                  <Fee label="to the farmers" value={dollars(money.merchandiseCents)} />
                  {delivering ? <Fee label="delivery fee" value={dollars(money.deliveryFeeCents)} /> : null}
                  <Fee label="transaction fee" value={dollars(money.platformFeeCents)} />
                  <Hair />
                  <Fee label="total" value={dollars(money.totalCents)} strong />
                </View>
                <View style={{ marginTop: 18, height: 52, borderRadius: 999, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 13.5, fontWeight: '600', color: colors.gray }}>preview</Text>
                </View>
                <Text style={note}>{PREVIEW_PAY_LINE}</Text>
                <Pressable onPress={() => setStep('info')} style={{ marginTop: 8, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Inter', color: colors.gray, fontSize: 13 }}>back</Text>
                </Pressable>
              </View>
            ) : null}
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
