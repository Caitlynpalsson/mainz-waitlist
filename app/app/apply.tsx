import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../src/components/chrome';
import { TurnstileField } from '../src/components/SiteExtras';
import { PrimaryButton, Wrap } from '../src/components/ui';
import { api } from '../src/lib/api';
import { REP_CODE_KEY } from '../../api/src/reps';
import { colors, useLayout } from '../src/theme';

const HOW = ['pickup', 'delivery', 'both'] as const;

export default function Apply() {
  const { desktop } = useLayout();
  const params = useLocalSearchParams<{ rep?: string }>();
  const [farmName, setFarmName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [whatYouSell, setWhat] = useState('');
  const [fulfillment, setFulfillment] = useState<(typeof HOW)[number]>('both');
  const [company, setCompany] = useState('');
  const [rep, setRep] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [turnstile, setTurnstile] = useState('');

  useEffect(() => {
    const fromUrl = String(params.rep || '').trim().toLowerCase();
    if (fromUrl && /^[a-z0-9]{4,12}$/.test(fromUrl)) {
      try { localStorage.setItem(REP_CODE_KEY, fromUrl); } catch { /* still send the code */ }
      setRep(fromUrl);
      return;
    }
    try {
      const saved = localStorage.getItem(REP_CODE_KEY) || '';
      if (/^[a-z0-9]{4,12}$/.test(saved)) setRep(saved);
    } catch { /* private mode */ }
  }, [params.rep]);

  function rememberRep(value: string) {
    const clean = value.trim().toLowerCase().slice(0, 12);
    setRep(clean);
    try {
      if (clean) localStorage.setItem(REP_CODE_KEY, clean);
      else localStorage.removeItem(REP_CODE_KEY);
    } catch { /* still send the typed code */ }
  }

  async function submit() {
    setError('');
    setSending(true);
    try {
      await api('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          farmName,
          contactName,
          email,
          city,
          whatYouSell,
          fulfillment,
          phone: '',
          link: '',
          sellNow: [],
          company,
          rep,
          turnstile,
        }),
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
      <Wrap style={{ paddingTop: desktop ? 64 : 24 }}>
        <View style={{ maxWidth: 420, alignSelf: 'center', width: '100%' }}>
          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={headline}>got it. we'll be in touch soon.</Text>
              <Text style={[quiet, { color: colors.red, marginTop: 12 }]}>welcome to the good side.</Text>
            </View>
          ) : (
            <>
              <Text style={headline}>apply to sell on the main course.</Text>
              <Text style={[quiet, { marginTop: 14 }]}>we read every one.{'\n'}you'll hear from a real person.</Text>
              <Field label="farm name" value={farmName} onChange={setFarmName} />
              <Field label="your name" value={contactName} onChange={setContactName} />
              <Field label="email" value={email} onChange={setEmail} keyboard="email-address" />
              <Field label="city" value={city} onChange={setCity} />
              <Field label="what you sell" value={whatYouSell} onChange={setWhat} />
              <Field label="who sent you? optional" value={rep} onChange={rememberRep} />
              <Text style={[quiet, { marginTop: 36 }]}>pickup or delivery</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 12 }}>
                {HOW.map((item) => (
                  <Pressable key={item} onPress={() => setFulfillment(item)} accessibilityRole="button">
                    <Text style={{ fontFamily: 'Inter', fontSize: 15, color: fulfillment === item ? colors.navy : colors.gray, fontWeight: fulfillment === item ? '600' : '400' }}>{item}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput value={company} onChangeText={setCompany} style={{ position: 'absolute', left: -9999, height: 0 }} accessibilityElementsHidden importantForAccessibility="no" />
              {error ? <Text style={[quiet, { color: colors.red, marginTop: 18 }]}>{error}</Text> : null}
              <View style={{ marginTop: 36 }}>
                <TurnstileField onToken={setTurnstile} />
                <PrimaryButton label={sending ? 'sending…' : 'apply to sell on the main course'} disabled={sending} onPress={submit} />
              </View>
            </>
          )}
        </View>
      </Wrap>
    </Shell>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard = 'default',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboard?: 'default' | 'email-address';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={label}
      placeholderTextColor={colors.gray}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType={keyboard}
      accessibilityLabel={label}
      style={field}
    />
  );
}

const headline = {
  fontFamily: 'Inter' as const,
  fontSize: 28,
  fontWeight: '600' as const,
  letterSpacing: -0.6,
  lineHeight: 34,
  color: colors.navy,
  textAlign: 'center' as const,
};
const quiet = {
  fontFamily: 'Inter' as const,
  fontSize: 13,
  lineHeight: 18,
  color: colors.gray,
  textAlign: 'center' as const,
};
const field = {
  fontFamily: 'Inter' as const,
  fontSize: 16,
  color: colors.navy,
  textAlign: 'center' as const,
  borderBottomWidth: 1,
  borderBottomColor: colors.hair,
  paddingVertical: 14,
  marginTop: 18,
};
