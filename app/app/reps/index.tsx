import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Shell } from '../../src/components/chrome';
import { PrimaryButton, Wrap } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { SITE_ORIGIN } from '../../src/lib/site';
import { REP_PAGE_LINES, REP_PAGE_TITLE } from '../../../api/src/reps';
import { colors, useLayout } from '../../src/theme';

type Joined = { code: string; applyPath: string; viewPath: string };

export default function Reps() {
  const { desktop } = useLayout();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<Joined | null>(null);
  const [copied, setCopied] = useState('');

  async function join() {
    setError('');
    setBusy(true);
    try {
      setJoined(await api<Joined>('/api/reps', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone }),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'try again.');
    } finally {
      setBusy(false);
    }
  }

  async function copy(label: string, path: string) {
    const link = `${origin()}${path}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(link);
      setCopied(label);
    } catch {
      setCopied('');
      setError('copy did not work. select the link instead.');
    }
  }

  return (
    <Shell nav="farmers" top="bar" title={REP_PAGE_TITLE}>
      <Wrap style={{ paddingTop: desktop ? 64 : 28 }}>
        <View style={{ maxWidth: 460, alignSelf: 'center', width: '100%', alignItems: 'center' }}>
          <Text style={headline}>{REP_PAGE_TITLE}</Text>
          {REP_PAGE_LINES.map((line) => <Text key={line} style={body}>{line}</Text>)}
          {joined ? (
            <View style={{ width: '100%', marginTop: 28 }}>
              <Text style={body}>this is your link. we do not email it.</Text>
              <Text style={link}>{origin()}{joined.applyPath}</Text>
              <Pressable onPress={() => copy('apply', joined.applyPath)} style={copyBtn}>
                <Text style={copyText}>{copied === 'apply' ? 'copied' : 'copy'}</Text>
              </Pressable>
              <Text style={[body, { marginTop: 28 }]}>your private page. save it. it is shown once.</Text>
              <Text style={link}>{origin()}{joined.viewPath}</Text>
              <Pressable onPress={() => copy('view', joined.viewPath)} style={copyBtn}>
                <Text style={copyText}>{copied === 'view' ? 'copied' : 'copy'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ width: '100%', marginTop: 12 }}>
              <Field label="your name" value={name} onChange={setName} />
              <Field label="email" value={email} onChange={setEmail} keyboard="email-address" />
              <Field label="phone" value={phone} onChange={setPhone} keyboard="phone-pad" />
              {error ? <Text style={err}>{error}</Text> : null}
              <View style={{ marginTop: 28 }}>
                <PrimaryButton label={busy ? 'saving…' : 'get my link'} disabled={busy} onPress={join} />
              </View>
            </View>
          )}
          {joined && error ? <Text style={err}>{error}</Text> : null}
        </View>
      </Wrap>
    </Shell>
  );
}

function origin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return SITE_ORIGIN;
}

function Field({ label, value, onChange, keyboard = 'default' }: { label: string; value: string; onChange: (value: string) => void; keyboard?: 'default' | 'email-address' | 'phone-pad' }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={label}
      placeholderTextColor={colors.gray}
      autoCapitalize="none"
      keyboardType={keyboard}
      accessibilityLabel={label}
      style={field}
    />
  );
}

const headline = { fontFamily: 'Inter' as const, fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.6, color: colors.navy, textAlign: 'center' as const };
const body = { fontFamily: 'Inter' as const, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center' as const, marginTop: 12 };
const link = { fontFamily: 'Inter' as const, fontSize: 14, lineHeight: 20, color: colors.navy, textAlign: 'center' as const, marginTop: 14 };
const err = { fontFamily: 'Inter' as const, color: colors.red, textAlign: 'center' as const, marginTop: 16 };
const field = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, textAlign: 'center' as const, backgroundColor: colors.cream, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginTop: 16, width: '100%' as const };
const copyBtn = { marginTop: 12, minHeight: 44, justifyContent: 'center' as const, alignItems: 'center' as const };
const copyText = { fontFamily: 'Inter' as const, fontSize: 14, fontWeight: '600' as const, color: colors.navy };
