import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import {
  digitsZip,
  checkoutSpots,
  pickupCardLine,
  pickupChoiceLabel,
  type PickupOption,
} from '../../../api/src/fulfillment';
import type { Fulfillment } from '../lib/orderMath';
import { colors } from '../theme';
import { PrimaryButton, Segment } from './ui';

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
  selectedLabel: string;
  onSelect: (label: string) => void;
  onContinue: () => void;
}) {
  const [browsing, setBrowsing] = useState(false);
  const [rankedZip, setRankedZip] = useState('');
  const clean = digitsZip(zip);
  const spots = clean.length === 5 ? checkoutSpots(options, clean) : { nearest: null, alternative: null, all: [] as PickupOption[] };
  const selected = spots.all.find((option) => pickupChoiceLabel(option) === selectedLabel) || spots.nearest;
  const showAlternative = !!spots.alternative && !!selected && pickupChoiceLabel(selected) === pickupChoiceLabel(spots.nearest!);
  const delivering = fulfillment === 'delivery' && routeMatched;

  useEffect(() => {
    if (clean.length !== 5 || !spots.all.length || !spots.nearest) return;
    const nearest = pickupChoiceLabel(spots.nearest);
    const known = spots.all.some((option) => pickupChoiceLabel(option) === selectedLabel);
    if (rankedZip === clean && known) return;
    setRankedZip(clean);
    setBrowsing(false);
    if (selectedLabel !== nearest) onSelect(nearest);
  }, [clean, spots.all.map((option) => pickupChoiceLabel(option)).join('|')]);

  const ready = delivering ? street.trim().length >= 4 : (options.length === 0 ? clean.length === 5 : !!selected);

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
      {!delivering && selected && !browsing ? (
        <View style={card}>
          <Text style={cardText}>{pickupCardLine(selected)}</Text>
        </View>
      ) : null}
      {!delivering && showAlternative && !browsing ? (
        <Text style={quietAlt}>{pickupCardLine(spots.alternative!)}</Text>
      ) : null}
      {!delivering && !browsing && spots.all.length > 1 ? (
        <Pressable onPress={() => setBrowsing(true)} accessibilityRole="button" style={linkHit}>
          <Text style={link}>see other spots</Text>
        </Pressable>
      ) : null}
      {!delivering && browsing ? (
        <View style={{ marginTop: 16 }}>
          {spots.all.map((option) => {
            const label = pickupChoiceLabel(option);
            return (
              <Pressable
                key={label}
                onPress={() => {
                  onSelect(label);
                  setBrowsing(false);
                }}
                accessibilityRole="button"
                style={listRow}
              >
                <Text style={cardText}>{pickupCardLine(option)}</Text>
              </Pressable>
            );
          })}
        </View>
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
const card = { marginTop: 18, backgroundColor: colors.cream, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 16 };
const cardText = { fontFamily: 'Inter' as const, fontSize: 15, lineHeight: 21, color: colors.navy };
const listRow = { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.hair };
const linkHit = { marginTop: 12, alignItems: 'center' as const, paddingVertical: 6 };
const link = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.gray };
const quietAlt = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 10 };
const note = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 12 };
