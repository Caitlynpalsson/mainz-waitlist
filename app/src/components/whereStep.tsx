import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import {
  digitsZip,
  PICKUP_COMING_SOON,
  canContinueWhere,
  checkoutSpots,
  pickupChoiceLabel,
  checkoutPillLabels,
  pickupSpotNote,
  type PickupOption,
} from '../../../api/src/fulfillment';
import type { Fulfillment } from '../lib/orderMath';
import { colors } from '../theme';
import { Pill, PrimaryButton, Segment } from './ui';

export function asPickupOptions(options: Array<Omit<PickupOption, 'zip' | 'lat' | 'lng'> & { zip?: string; lat?: number | null; lng?: number | null }>): PickupOption[] {
  return options.map((option) => ({
    ...option,
    zip: option.zip || digitsZip(option.address),
    lat: option.lat ?? null,
    lng: option.lng ?? null,
  }));
}

export function WhereStep({
  fulfillment,
  onFulfillment,
  zip,
  onZip,
  street,
  onStreet,
  routeMatched,
  routeNote,
  options,
  deliverySlots,
  selectedLabel,
  onSelect,
  onContinue,
}: {
  fulfillment: Fulfillment;
  onFulfillment: (value: Fulfillment) => void;
  zip: string;
  onZip: (zip: string) => void;
  street: string;
  onStreet: (street: string) => void;
  routeMatched: boolean;
  routeNote: string;
  options: PickupOption[];
  deliverySlots?: { label: string }[];
  selectedLabel: string;
  onSelect: (label: string) => void;
  onContinue: () => void;
}) {
  const [rankedZip, setRankedZip] = useState('');
  const clean = digitsZip(zip);
  const hasSpots = options.length > 0;
  const spots = hasSpots && clean.length === 5
    ? checkoutSpots(options, clean)
    : { nearest: null, alternative: null, others: [] as PickupOption[], visible: [] as PickupOption[] };
  const selected = spots.visible.find((option) => pickupChoiceLabel(option) === selectedLabel) || spots.nearest;
  const delivering = fulfillment === 'delivery' && routeMatched;

  useEffect(() => {
    if (!hasSpots || clean.length !== 5 || !spots.visible.length || !spots.nearest) return;
    const nearest = pickupChoiceLabel(spots.nearest);
    const known = spots.visible.some((option) => pickupChoiceLabel(option) === selectedLabel);
    if (rankedZip === clean && known) return;
    setRankedZip(clean);
    if (selectedLabel !== nearest) onSelect(nearest);
  }, [clean, hasSpots, spots.visible.map((option) => pickupChoiceLabel(option)).join('|')]);

  const ready = canContinueWhere({
    hasPickupOptions: hasSpots,
    delivering,
    streetReady: street.trim().length >= 4,
    spotChosen: !!selected,
  });

  return (
    <View>
      {routeMatched ? (
        <Segment
          track={colors.cream}
          value={fulfillment}
          onChange={(value) => onFulfillment(value as Fulfillment)}
          options={[{ value: 'pickup', label: 'pickup' }, { value: 'delivery', label: 'delivery' }]}
        />
      ) : null}
      <Text style={zipLabel}>your zip code</Text>
      <TextInput
        value={clean}
        onChangeText={(value) => onZip(digitsZip(value))}
        placeholder="zip"
        placeholderTextColor={colors.gray}
        keyboardType="number-pad"
        inputMode="numeric"
        autoFocus
        maxLength={5}
        accessibilityLabel="your zip code"
        style={zipField}
      />
      {clean.length === 5 && routeNote && !routeMatched ? <Text style={note}>{routeNote}</Text> : null}
      {!hasSpots && !delivering ? <Text style={note}>{PICKUP_COMING_SOON}</Text> : null}
      {!delivering && hasSpots && spots.visible.length ? (
        <View style={pillRow}>
          {checkoutPillLabels(spots.visible).map((text, index) => {
            const option = spots.visible[index];
            const label = pickupChoiceLabel(option);
            const on = !!selected && label === pickupChoiceLabel(selected);
            return <Pill key={label} small cream={!on} on={on} label={text} onPress={() => onSelect(label)} />;
          })}
        </View>
      ) : null}
      {!delivering && hasSpots && selected ? <Text style={note}>{pickupSpotNote(selected)}</Text> : null}
      {delivering && (deliverySlots || []).length ? (
        <View style={pillRow}>
          {deliverySlots!.map((slot) => (
            <Pill key={slot.label} small cream={slot.label !== selectedLabel} on={slot.label === selectedLabel} label={slot.label} onPress={() => onSelect(slot.label)} />
          ))}
        </View>
      ) : null}
      {delivering ? (
        <TextInput
          value={street}
          onChangeText={onStreet}
          placeholder="street"
          placeholderTextColor={colors.gray}
          accessibilityLabel="street"
          autoCapitalize="words"
          style={fieldBox}
        />
      ) : null}
      <View style={{ marginTop: 22 }}>
        <PrimaryButton label="continue to your info" disabled={!ready} onPress={onContinue} />
      </View>
    </View>
  );
}

export function InfoStep({
  name,
  email,
  phone,
  onName,
  onEmail,
  onPhone,
  onReview,
  onBack,
}: {
  name: string;
  email: string;
  phone: string;
  onName: (value: string) => void;
  onEmail: (value: string) => void;
  onPhone: (value: string) => void;
  onReview: () => void;
  onBack: () => void;
}) {
  const ready = name.trim().length >= 2 && email.includes('@');
  return (
    <View>
      <Field label="your name" value={name} onChange={onName} autoCapitalize="words" />
      <Field label="email" value={email} onChange={onEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="phone" value={phone} onChange={onPhone} keyboardType="phone-pad" autoCapitalize="none" />
      <View style={{ marginTop: 22 }}>
        <PrimaryButton label="review order" disabled={!ready} onPress={onReview} />
      </View>
      <Pressable onPress={onBack} style={linkHit}><Text style={link}>back</Text></Pressable>
    </View>
  );
}

function Field({ label, value, onChange, keyboardType, autoCapitalize }: { label: string; value: string; onChange: (value: string) => void; keyboardType?: 'email-address' | 'phone-pad'; autoCapitalize?: 'none' | 'words' }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={label}
      placeholderTextColor={colors.gray}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
      accessibilityLabel={label}
      style={fieldBox}
    />
  );
}

const zipLabel = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.gray, textAlign: 'center' as const, marginTop: 18 };
const fieldBox = {
  fontFamily: 'Inter' as const,
  fontSize: 16,
  color: colors.navy,
  backgroundColor: colors.cream,
  borderWidth: 1,
  borderStyle: 'solid' as const,
  borderColor: colors.hair,
  borderRadius: 16,
  paddingVertical: 14,
  paddingHorizontal: 16,
  marginTop: 10,
};
const zipField = {
  ...fieldBox,
  fontSize: 28,
  fontWeight: '600' as const,
  textAlign: 'center' as const,
  letterSpacing: 4,
};
const pillRow = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'center' as const, gap: 8, marginTop: 16 };
const linkHit = { marginTop: 12, alignItems: 'center' as const, paddingVertical: 6 };
const link = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.gray };
const note = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 12 };
