import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { formatCutoffTime } from '../../../api/src/delivery';
import { Cap } from './ui';
import { api } from '../lib/api';
import { adminHeaders } from '../lib/adminAuth';
import { colors } from '../theme';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

type Run = {
  id: number | null;
  runDate: string;
  status: string;
  count: number;
  label: string;
  line: string;
  canClose: boolean;
  sheetReady: boolean;
};

type RouteRow = {
  id: number;
  name: string;
  area: string;
  deliveryDay: number;
  cutoffDay: number;
  cutoffTime: string;
  minOrders: number;
  targetOrders: number;
  active: boolean;
  isSample: boolean;
  runs: Run[];
};

type Draft = {
  id: number | null;
  name: string;
  area: string;
  deliveryDay: number;
  cutoffDay: number;
  cutoffTime: string;
  minOrders: string;
  targetOrders: string;
  active: boolean;
};

const blank = (): Draft => ({
  id: null,
  name: '',
  area: '',
  deliveryDay: 2,
  cutoffDay: 1,
  cutoffTime: '6pm',
  minOrders: '3',
  targetOrders: '5',
  active: true,
});

export function RoutesPanel({ token }: { token: string }) {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [draft, setDraft] = useState<Draft>(blank());
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState('');
  const [copied, setCopied] = useState(false);

  function load() {
    api<{ routes: RouteRow[] }>('/api/admin/routes', { headers: adminHeaders(token) })
      .then((data) => setRoutes(data.routes))
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, [token]);

  async function save() {
    setError('');
    const body = {
      name: draft.name,
      area: draft.area,
      deliveryDay: draft.deliveryDay,
      cutoffDay: draft.cutoffDay,
      cutoffTime: draft.cutoffTime,
      minOrders: Number(draft.minOrders),
      targetOrders: Number(draft.targetOrders),
      active: draft.active,
    };
    try {
      const data = draft.id
        ? await api<{ routes: RouteRow[] }>(`/api/admin/routes/${draft.id}`, { method: 'PATCH', headers: adminHeaders(token), body: JSON.stringify(body) })
        : await api<{ routes: RouteRow[] }>('/api/admin/routes', { method: 'POST', headers: adminHeaders(token), body: JSON.stringify(body) });
      setRoutes(data.routes);
      setDraft(blank());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not save the route.');
    }
  }

  async function closeRun(routeId: number, runDate: string) {
    setError('');
    try {
      const data = await api<{ routes: RouteRow[] }>(`/api/admin/routes/${routeId}/close`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ runDate }),
      });
      setRoutes(data.routes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not close the run.');
    }
  }

  async function openSheet(routeId: number, runDate: string) {
    setError('');
    setCopied(false);
    try {
      const data = await api<{ text: string }>(`/api/admin/routes/${routeId}/sheet`, {
        method: 'POST',
        headers: adminHeaders(token),
        body: JSON.stringify({ runDate }),
      });
      setSheet(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not build the list.');
    }
  }

  async function copySheet() {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(sheet);
      setCopied(true);
    }
  }

  function printSheet() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const page = window.open('', '_blank');
    if (!page) return;
    page.document.write(`<pre style="font-family: Inter, sans-serif; white-space: pre-wrap">${sheet.replace(/</g, '&lt;')}</pre>`);
    page.document.close();
    page.focus();
    page.print();
  }

  return (
    <View style={{ marginTop: 36 }}>
      <Cap>routes</Cap>
      <Text style={quiet}>a route needs at least 3 orders. 5 is the target. nothing is texted or emailed.</Text>
      {routes.map((route) => (
        <View key={route.id} style={card}>
          <Pressable onPress={() => setDraft({
            id: route.id,
            name: route.name,
            area: route.area,
            deliveryDay: route.deliveryDay,
            cutoffDay: route.cutoffDay,
            cutoffTime: formatCutoffTime(route.cutoffTime),
            minOrders: String(route.minOrders),
            targetOrders: String(route.targetOrders),
            active: route.active,
          })}>
            <Text style={name}>{route.name}{route.isSample ? ' · sample' : ''}{route.active ? '' : ' · off'}</Text>
            <Text style={small}>{DAYS[route.deliveryDay]} delivery · cutoff {DAYS[route.cutoffDay]} {formatCutoffTime(route.cutoffTime)} · {route.area}</Text>
          </Pressable>
          {route.runs.map((run) => (
            <View key={run.runDate} style={{ marginTop: 10 }}>
              <Text style={small}>{run.line}</Text>
              <Text style={small}>{run.label} · {run.status === 'open' ? 'pending route' : run.status}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                {run.canClose ? <Pressable onPress={() => closeRun(route.id, run.runDate)}><Text style={link}>close run now</Text></Pressable> : null}
                {run.sheetReady ? <Pressable onPress={() => openSheet(route.id, run.runDate)}><Text style={link}>order list</Text></Pressable> : null}
              </View>
            </View>
          ))}
        </View>
      ))}
      <Text style={[quiet, { marginTop: 18 }]}>{draft.id ? 'edit route' : 'new route'}</Text>
      <Field label="name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      <Field label="zips and towns, comma separated" value={draft.area} onChange={(area) => setDraft({ ...draft, area })} />
      <DayRow label="delivery day" value={draft.deliveryDay} onChange={(deliveryDay) => setDraft({ ...draft, deliveryDay })} />
      <DayRow label="cutoff day" value={draft.cutoffDay} onChange={(cutoffDay) => setDraft({ ...draft, cutoffDay })} />
      <Field label="cutoff time, like 6pm" value={draft.cutoffTime} onChange={(cutoffTime) => setDraft({ ...draft, cutoffTime })} />
      <Field label="min orders" value={draft.minOrders} onChange={(minOrders) => setDraft({ ...draft, minOrders })} />
      <Field label="target orders" value={draft.targetOrders} onChange={(targetOrders) => setDraft({ ...draft, targetOrders })} />
      <Pressable onPress={() => setDraft({ ...draft, active: !draft.active })} style={{ marginTop: 12 }}>
        <Text style={link}>{draft.active ? 'active. turn off' : 'off. turn on'}</Text>
      </Pressable>
      {error ? <Text style={err}>{error}</Text> : null}
      <Pressable onPress={save} style={{ marginTop: 14 }}>
        <Text style={link}>{draft.id ? 'save route' : 'add route'}</Text>
      </Pressable>
      {sheet ? (
        <View style={{ marginTop: 16 }}>
          <TextInput
            editable={false}
            multiline
            value={sheet}
            style={[sheetBox, { height: Math.max(12, sheet.split('\n').length + 1) * 20 }]}
          />
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
            {Platform.OS === 'web' ? <Pressable onPress={copySheet}><Text style={link}>{copied ? 'copied' : 'copy list'}</Text></Pressable> : null}
            {Platform.OS === 'web' ? <Pressable onPress={printSheet}><Text style={link}>print</Text></Pressable> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function DayRow({ label, value, onChange }: { label: string; value: number; onChange: (day: number) => void }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={small}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
        {DAYS.map((day, index) => (
          <Pressable key={day} onPress={() => onChange(index)}>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: value === index ? colors.navy : colors.gray, fontWeight: value === index ? '600' : '400' }}>{day}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={label}
      placeholderTextColor={colors.gray}
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel={label}
      style={input}
    />
  );
}

const quiet = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray, marginTop: 10, lineHeight: 18 };
const err = { fontFamily: 'Inter' as const, color: colors.red, marginTop: 12 };
const name = { fontFamily: 'Inter' as const, fontWeight: '600' as const, color: colors.navy };
const small = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray, marginTop: 4 };
const link = { fontFamily: 'Inter' as const, color: colors.navy, fontWeight: '600' as const, fontSize: 13 };
const input = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 10, marginTop: 12 };
const card = { borderWidth: 1, borderColor: colors.hair, borderRadius: 18, padding: 16, marginTop: 12, backgroundColor: colors.white };
const sheetBox = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.navy, minHeight: 120, marginTop: 8, textAlignVertical: 'top' as const };
