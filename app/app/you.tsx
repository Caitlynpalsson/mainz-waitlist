import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Shell } from '../src/components/chrome';
import { TurnstileField } from '../src/components/SiteExtras';
import { Cap, Hair, PrimaryButton, Wrap } from '../src/components/ui';
import { api } from '../src/lib/api';
import { REP_CODE_KEY } from '../../api/src/reps';
import { colors, useLayout } from '../src/theme';

const field = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, textAlign: 'center' as const, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 10, marginTop: 14 };

const links = [
  ['apply as a farm', '/apply'],
  ['farm dashboard', '/dashboard'],
  ['the main course standard', '/standard'],
  ['for farmers', '/for-farmers'],
  ['help', '/help'],
  ['admin', '/admin'],
] as const;

export default function You() {
  const { desktop } = useLayout();
  const params = useLocalSearchParams<{ rep?: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rep, setRep] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [turnstile, setTurnstile] = useState('');

  useEffect(() => {
    const fromUrl = String(params.rep || '').trim().toLowerCase();
    if (/^[a-z0-9]{4,12}$/.test(fromUrl)) {
      try { localStorage.setItem(REP_CODE_KEY, fromUrl); } catch { /* still send it */ }
      setRep(fromUrl);
      return;
    }
    try {
      const saved = localStorage.getItem(REP_CODE_KEY) || '';
      if (/^[a-z0-9]{4,12}$/.test(saved)) setRep(saved);
    } catch { /* private mode */ }
  }, [params.rep]);

  async function joinList() {
    setBusy(true);
    setNote('');
    try {
      await api('/api/shoppers', { method: 'POST', body: JSON.stringify({ name, email, rep, turnstile }) });
      setNote("you're on the list. we won't email you from this preview.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell nav={null} tab="you" showTabs top="bar" title="you">
      <Wrap style={{ paddingTop: desktop ? 64 : 16 }}>
        <View style={{ maxWidth: 460, alignSelf: 'center', width: '100%' }}>
          <Cap>you</Cap>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: colors.navy, marginTop: 12 }}>
            no account yet. leave your name and we'll keep your spot.
          </Text>
          <TextInput value={name} onChangeText={setName} placeholder="your name" placeholderTextColor={colors.gray} style={field} />
          <TextInput value={email} onChangeText={setEmail} placeholder="email" placeholderTextColor={colors.gray} autoCapitalize="none" keyboardType="email-address" style={field} />
          <TurnstileField onToken={setTurnstile} />
          <View style={{ marginTop: 16 }}>
            <PrimaryButton label={busy ? 'saving…' : 'count me in'} disabled={busy} onPress={joinList} />
          </View>
          {note ? <Text style={{ fontFamily: 'Inter', color: colors.gray, textAlign: 'center', marginTop: 12 }}>{note}</Text> : null}
          <View style={{ marginTop: 28 }}>
            {links.map(([label, href]) => (
              <Pressable key={href} onPress={() => router.push(href)} style={{ paddingVertical: 16 }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.navy }}>{label}</Text>
                <View style={{ marginTop: 16 }}><Hair /></View>
              </Pressable>
            ))}
          </View>
        </View>
      </Wrap>
    </Shell>
  );
}
