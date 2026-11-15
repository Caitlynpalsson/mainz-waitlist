import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/components/chrome';
import { FoodImage, PrimaryButton, Wrap } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { dollars } from '../../src/lib/money';
import { colors, useLayout } from '../../src/theme';

type Listing = {
  farmName: string;
  story: string;
  location: string;
  status: string;
  statusLabel: string;
  changeNote: string;
  approvedAt: string;
  isSample: boolean;
  products: { id: number; name: string; priceCents: number; unit: string; photoKey: string }[];
};

export default function ListingApproval() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { desktop } = useLayout();
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) return;
    api<Listing>(`/api/listings/${token}`).then(setData).catch((err: Error) => setError(err.message));
  }, [token, message]);

  async function send(path: string, body?: unknown) {
    if (!token) return;
    setBusy(true);
    setFormError('');
    setMessage('');
    try {
      await api(path, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      setNote('');
      setMessage(path.endsWith('/approve') ? 'you approved this listing. we will use it when orders open.' : 'we got your note.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell top="bar" title="your listing">
      <Wrap style={{ paddingTop: desktop ? 64 : 24 }}>
        <View style={{ maxWidth: 420, alignSelf: 'center', width: '100%', alignItems: 'center' }}>
          {error ? <Text style={quiet}>{error}</Text> : null}
          {!data && !error ? <Text style={quiet}>loading.</Text> : null}
          {data ? (
            <>
              {data.isSample ? <Text style={quiet}>sample. this farm is made up.</Text> : null}
              <Text style={headline}>your mainz listing</Text>
              <Text style={[quiet, { marginTop: 14 }]}>take a look and approve it so you're ready when orders open.</Text>
              <Text style={farm}>{data.farmName.toLowerCase()}</Text>
              {data.location ? <Text style={quiet}>{data.location.toLowerCase()}</Text> : null}
              {data.story ? <Text style={[story, { marginTop: 18 }]}>{data.story}</Text> : null}
              <View style={{ marginTop: 36, width: '100%', alignItems: 'center' }}>
                {data.products.map((product) => (
                  <View key={product.id} style={{ alignItems: 'center', marginBottom: 36 }}>
                    <View style={frame}>
                      <FoodImage photo={product.photoKey} name={product.name} width={168} height={168} />
                    </View>
                    <Text style={productName}>{product.name}</Text>
                    <Text style={quiet}>{dollars(product.priceCents, 'auto')} / {product.unit}</Text>
                  </View>
                ))}
              </View>
              <Text style={quiet}>this is how your listing will look. orders open at launch. you are not taking orders yet.</Text>
              {data.status === 'farm_approved' && data.approvedAt ? (
                <Text style={[quiet, { marginTop: 10 }]}>you approved this on {data.approvedAt.slice(0, 10)}.</Text>
              ) : null}
              {data.changeNote ? <Text style={[quiet, { marginTop: 10 }]}>your note: {data.changeNote}</Text> : null}
              {message ? <Text style={[quiet, { color: colors.navy, marginTop: 16 }]}>{message}</Text> : null}
              {formError ? <Text style={[quiet, { color: colors.red, marginTop: 16 }]}>{formError}</Text> : null}
              <View style={{ marginTop: 22, width: '100%', maxWidth: 320 }}>
                <PrimaryButton label={busy ? 'saving…' : 'approve my listing'} disabled={busy} onPress={() => send(`/api/listings/${token}/approve`)} />
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="what should we change?"
                placeholderTextColor={colors.gray}
                multiline
                style={noteBox}
              />
              <View style={{ marginTop: 12, width: '100%', maxWidth: 320 }}>
                <PrimaryButton label="ask for changes" disabled={busy} onPress={() => send(`/api/listings/${token}/changes`, { note })} />
              </View>
            </>
          ) : null}
        </View>
      </Wrap>
    </Shell>
  );
}

const headline = { fontFamily: 'Inter' as const, fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.6, lineHeight: 34, color: colors.navy, textAlign: 'center' as const, marginTop: 8 };
const farm = { fontFamily: 'Inter' as const, fontSize: 22, fontWeight: '600' as const, color: colors.navy, textAlign: 'center' as const, marginTop: 28 };
const story = { fontFamily: 'Inter' as const, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center' as const };
const productName = { fontFamily: 'Inter' as const, fontSize: 16, fontWeight: '600' as const, color: colors.navy, marginTop: 14, textAlign: 'center' as const };
const quiet = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const };
const frame = { width: 168, height: 168, borderRadius: 22, overflow: 'hidden' as const, backgroundColor: colors.cream };
const noteBox = { fontFamily: 'Inter' as const, fontSize: 15, color: colors.navy, textAlign: 'center' as const, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 12, marginTop: 28, width: '100%' as const, minHeight: 44 };
