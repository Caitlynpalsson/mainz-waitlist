import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Shell } from '../src/components/chrome';
import { Cap, Pill, PrimaryButton, Wrap } from '../src/components/ui';
import { api } from '../src/lib/api';
import { colors, useLayout } from '../src/theme';

const TOKEN_KEY = 'mainz.adminToken';

type AdminFarm = {
  id: number;
  slug: string;
  name: string;
  city: string;
  status: string;
  active: boolean;
  email: string;
  whatYouSell: string;
  sellNow: string;
  fulfillmentPref: string;
  accessToken: string | null;
  isDemo: boolean;
};

export default function Admin() {
  const { desktop } = useLayout();
  const [token, setToken] = useState('');
  const [draft, setDraft] = useState('');
  const [farms, setFarms] = useState<AdminFarm[] | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then((saved) => {
      if (saved) {
        setToken(saved);
        setDraft(saved);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!token) return;
    load(token);
  }, [token]);

  async function load(current: string) {
    setError('');
    try {
      const data = await api<{ farms: AdminFarm[] }>('/api/admin/farms', { headers: { authorization: `Bearer ${current}` } });
      setFarms(data.farms);
    } catch (err) {
      setFarms(null);
      setError(err instanceof Error ? err.message : 'could not open admin.');
    }
  }

  async function saveToken() {
    const next = draft.trim();
    await AsyncStorage.setItem(TOKEN_KEY, next);
    setToken(next);
  }

  async function act(path: string, body?: unknown) {
    setNote('');
    try {
      const result = await api<{ accessToken?: string; name?: string }>(path, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (result.accessToken) setNote(`${result.name || 'farm'} dashboard token: ${result.accessToken}`);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'that did not work.');
    }
  }

  const pending = (farms || []).filter((farm) => farm.status === 'pending');
  const approved = (farms || []).filter((farm) => farm.status === 'approved');
  const rejected = (farms || []).filter((farm) => farm.status === 'rejected');

  return (
    <Shell top="bar" title="admin">
      <Wrap style={{ paddingTop: desktop ? 48 : 12 }}>
        <View style={{ maxWidth: 720, alignSelf: 'center', width: '100%' }}>
          <Cap>admin</Cap>
          <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.ink, marginTop: 10, lineHeight: 21 }}>
            the gate is the worker secret ADMIN_TOKEN. it is not stored in the repo.
          </Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="admin token"
            placeholderTextColor={colors.gray}
            secureTextEntry
            autoCapitalize="none"
            style={input}
          />
          <View style={{ marginTop: 12, maxWidth: 220 }}>
            <PrimaryButton label="open the queue" onPress={saveToken} />
          </View>
          {error ? <Text style={{ fontFamily: 'Inter', color: colors.red, marginTop: 12 }}>{error}</Text> : null}
          {note ? <Text style={{ fontFamily: 'Inter', color: colors.navy, marginTop: 12 }}>{note}</Text> : null}

          {farms ? (
            <>
              <Section title="pending" farms={pending} empty="no applications waiting." render={(farm) => (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pill label="approve" on onPress={() => act(`/api/admin/farms/${farm.id}/approve`)} />
                  <Pill label="reject" onPress={() => act(`/api/admin/farms/${farm.id}/reject`)} />
                </View>
              )} />
              <Section title="approved" farms={approved} empty="none yet." render={(farm) => (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
                  <Pill label={farm.active ? 'on. switch off' : 'off. switch on'} on={farm.active} onPress={() => act(`/api/admin/farms/${farm.id}/active`, { active: !farm.active })} />
                  {farm.accessToken ? <Text style={small}>token {farm.accessToken}</Text> : null}
                </View>
              )} />
              <Section title="rejected" farms={rejected} empty="none." render={() => null} />
            </>
          ) : null}
        </View>
      </Wrap>
    </Shell>
  );
}

function Section({ title, farms, empty, render }: { title: string; farms: AdminFarm[]; empty: string; render: (farm: AdminFarm) => ReactNode }) {
  return (
    <View style={{ marginTop: 36 }}>
      <Cap>{title}</Cap>
      {farms.length === 0 ? <Text style={{ fontFamily: 'Inter', color: colors.gray, marginTop: 10 }}>{empty}</Text> : null}
      {farms.map((farm) => (
        <View key={farm.id} style={{ borderWidth: 1, borderColor: colors.hair, borderRadius: 18, padding: 16, marginTop: 12 }}>
          <Text style={{ fontFamily: 'Inter', fontWeight: '600', color: colors.navy }}>{farm.name.toLowerCase()}{farm.isDemo ? ' · sample' : ''}</Text>
          <Text style={small}>{farm.city.toLowerCase()} · {farm.email}</Text>
          <Text style={small}>{farm.whatYouSell}</Text>
          {farm.sellNow ? <Text style={small}>{farm.sellNow} · {farm.fulfillmentPref}</Text> : null}
          {render(farm)}
        </View>
      ))}
    </View>
  );
}

const input = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.navy, paddingVertical: 8, marginTop: 18 };
const small = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray, marginTop: 4 };
