import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Shell } from '../src/components/chrome';
import { Cap, Pill, PrimaryButton, Wrap } from '../src/components/ui';
import { api } from '../src/lib/api';
import { colors, useLayout } from '../src/theme';

const SELL = ['farmers market', 'farm stand', 'online', 'csa', 'stores or restaurants', 'just starting'];
const HOW = ['pickup', 'delivery', 'both', 'not sure yet'];

export default function Apply() {
  const { desktop } = useLayout();
  const [farmName, setFarmName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [whatYouSell, setWhat] = useState('');
  const [link, setLink] = useState('');
  const [sellNow, setSellNow] = useState<string[]>([]);
  const [fulfillment, setFulfillment] = useState('both');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit() {
    setError('');
    setSending(true);
    try {
      await api('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ farmName, contactName, email, phone, city, whatYouSell, link, sellNow, fulfillment, company }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Shell nav="farmers" top="bar" title="apply">
      <Wrap style={{ paddingTop: desktop ? 56 : 12 }}>
        <View style={{ maxWidth: 460, alignSelf: 'center', width: '100%' }}>
          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 16, color: colors.navy, textAlign: 'center' }}>got it. we'll be in touch soon.</Text>
              <Text style={{ fontFamily: 'Inter', color: colors.red, marginTop: 8 }}>welcome to the good side.</Text>
            </View>
          ) : (
            <>
              <Cap>for farmers</Cap>
              <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: colors.navy, marginTop: 12 }}>apply to sell on mainz.</Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.gray, marginTop: 8 }}>we read every one. you'll hear from a real person.</Text>
              <Field label="farm name" value={farmName} onChange={setFarmName} />
              <Field label="your name" value={contactName} onChange={setContactName} />
              <Field label="email" value={email} onChange={setEmail} />
              <Field label="phone" value={phone} onChange={setPhone} />
              <Field label="city" value={city} onChange={setCity} />
              <Field label="what you sell" value={whatYouSell} onChange={setWhat} />
              <Field label="instagram or website" value={link} onChange={setLink} />
              <Text style={label}>how you sell now</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SELL.map((item) => (
                  <Pill
                    key={item}
                    label={item}
                    on={sellNow.includes(item)}
                    onPress={() => setSellNow((current) => current.includes(item) ? current.filter((x) => x !== item) : [...current, item])}
                  />
                ))}
              </View>
              <Text style={label}>pickup or delivery</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {HOW.map((item) => <Pill key={item} label={item} on={fulfillment === item} onPress={() => setFulfillment(item)} />)}
              </View>
              <TextInput value={company} onChangeText={setCompany} style={{ position: 'absolute', left: -9999, height: 0 }} accessibilityElementsHidden />
              {error ? <Text style={{ fontFamily: 'Inter', color: colors.red, marginTop: 16 }}>{error}</Text> : null}
              <View style={{ marginTop: 28 }}>
                <PrimaryButton label={sending ? 'sending…' : 'apply to sell on mainz'} disabled={sending} onPress={submit} />
              </View>
              <Pressable onPress={() => undefined} />
            </>
          )}
        </View>
      </Wrap>
    </Shell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={labelStyle}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} style={input} autoCapitalize="none" />
    </View>
  );
}

const label = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.ink, marginTop: 20, marginBottom: 8 };
const labelStyle = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.ink, marginBottom: 4 };
const input = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.navy, paddingVertical: 6 };
