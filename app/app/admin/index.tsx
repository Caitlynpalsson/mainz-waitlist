import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { PIPELINE_STAGES } from '../../../api/src/review';
import { listingInvite } from '../../../api/src/listing';
import { Shell } from '../../src/components/chrome';
import { Cap, Pill, PrimaryButton, Wrap } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { adminHeaders, useAdminToken } from '../../src/lib/adminAuth';
import { dollars } from '../../src/lib/money';
import { colors, useLayout } from '../../src/theme';

type Brief = {
  id: number;
  name: string;
  city: string;
  stage: string;
  decision: string;
  status: string;
  active: boolean;
  isDemo: boolean;
  whatYouSell: string;
  conditionsNote: string;
  overdue: boolean;
  dueAt: string | null;
  dueWaiting: string;
  quarterlyOverdue: boolean;
  paused: boolean;
  removed: boolean;
};

type StaffListing = {
  id: number;
  farmName: string;
  farmerNames: string;
  path: string;
  statusLabel: string;
  changeNote: string;
  approvedAt: string;
  isSample: boolean;
};

type CsvPreview = {
  farms: { farm: string; products: { name: string; problems: string[] }[] }[];
  rowProblems: { row: number; farm: string; product: string; problems: string[] }[];
  unmatched: string[];
};

type WindowTotals = { orders: number; merchandiseCents: number; totalCents: number };

type Dashboard = {
  test: boolean;
  testLabel: string;
  counts: {
    newApplications: number;
    inReview: number;
    approved: number;
    active: number;
    waitlist: number;
    declined: number;
    overdue: number;
    pipeline: Record<string, number>;
  };
  overdue: Brief[];
  newApplications: Brief[];
  inReview: Brief[];
  approved: Brief[];
  other: Brief[];
  sales: { allTime: WindowTotals; last7Days: WindowTotals; last30Days: WindowTotals };
  topByUnits: { name: string; units: number; revenueCents: number }[];
  topByRevenue: { name: string; units: number; revenueCents: number }[];
  repeatBuyers: { name: string; email: string; phone: string; orders: number; totalCents: number }[];
};

const stageLabel = new Map(PIPELINE_STAGES.map((stage) => [stage.key, stage.label]));

export default function AdminHome() {
  const { desktop } = useLayout();
  const auth = useAdminToken();
  const [data, setData] = useState<Dashboard | null>(null);
  const [listings, setListings] = useState<StaffListing[]>([]);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth.token) return;
    load(auth.token);
  }, [auth.token]);

  async function load(current: string) {
    setError('');
    try {
      setData(await api<Dashboard>('/api/admin/dashboard', { headers: adminHeaders(current) }));
      try {
        const drafts = await api<{ listings: StaffListing[] }>('/api/admin/listings', { headers: adminHeaders(current) });
        setListings(drafts.listings);
      } catch {
        setListings([]);
      }
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'could not open admin.');
    }
  }

  async function previewCsv() {
    if (!auth.token) return;
    setError('');
    try {
      setPreview(await api<CsvPreview>('/api/admin/listings/preview', {
        method: 'POST',
        headers: adminHeaders(auth.token),
        body: JSON.stringify({ csv }),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not read that csv.');
    }
  }

  async function createDrafts() {
    if (!auth.token) return;
    setError('');
    try {
      await api('/api/admin/listings/import', {
        method: 'POST',
        headers: adminHeaders(auth.token),
        body: JSON.stringify({ csv }),
      });
      setPreview(null);
      setCsv('');
      await load(auth.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not create drafts.');
    }
  }

  async function copyInvite(listing: StaffListing) {
    const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : '';
    const text = listingInvite({
      farmerNames: listing.farmerNames,
      farmName: listing.farmName,
      link: `${origin}${listing.path}`,
    });
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(listing.path);
        return;
      }
    } catch {
      setCopied('');
    }
    setCopied(text);
  }

  function chooseCsv() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      file.text().then(setCsv);
    };
    input.click();
  }

  async function toggle(farm: Brief) {
    if (!auth.token) return;
    setError('');
    try {
      await api(`/api/admin/farms/${farm.id}/active`, {
        method: 'POST',
        headers: adminHeaders(auth.token),
        body: JSON.stringify({ active: !farm.active }),
      });
      await load(auth.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'that did not work.');
    }
  }

  return (
    <Shell top="bar" title="admin">
      <Wrap style={{ paddingTop: desktop ? 40 : 12 }}>
        <Cap>admin</Cap>
        <Text style={lede}>the gate is the worker secret ADMIN_TOKEN. it is not stored in the repo.</Text>
        <TextInput
          value={auth.draft}
          onChangeText={auth.setDraft}
          placeholder="admin token"
          placeholderTextColor={colors.gray}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={input}
        />
        <View style={{ marginTop: 12, maxWidth: 220 }}>
          <PrimaryButton label="open the desk" onPress={() => { auth.save().catch(() => undefined); }} />
        </View>
        {error ? <Text style={err}>{error}</Text> : null}

        {data ? (
          <>
            <View style={banner}>
              <Text style={bannerText}>{data.testLabel}</Text>
            </View>
            {data.overdue.length ? (
              <View style={[banner, { backgroundColor: '#F8E6E6' }]}>
                <Text style={bannerText}>{data.overdue.length} overdue. {data.overdue.filter((farm) => farm.quarterlyOverdue).length ? 'includes a quarterly re-check.' : 'a goal time has passed.'}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 12, marginTop: 16 }}>
              <Stat label="all-time" window={data.sales.allTime} />
              <Stat label="last 7 days" window={data.sales.last7Days} />
              <Stat label="last 30 days" window={data.sales.last30Days} />
            </View>
            <Text style={quiet}>
              {PIPELINE_STAGES.map((stage) => `${stage.label} ${data.counts.pipeline[stage.key] || 0}`).join('  ·  ')}
            </Text>
            <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 28 : 0, alignItems: 'flex-start' }}>
              <View style={{ flex: 1, width: '100%' }}>
                <FarmList title={`new · ${data.counts.newApplications}`} farms={data.newApplications} empty="no new applications." />
                <FarmList title={`in review · ${data.counts.inReview}`} farms={data.inReview} empty="nothing moving through the pipeline." />
              </View>
              <View style={{ flex: 1, width: '100%' }}>
                <FarmList
                  title={`approved · ${data.counts.approved} · ${data.counts.active} on`}
                  farms={data.approved}
                  empty="no approved farms."
                  extra={(farm) => (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Pill label={farm.active ? 'on. switch off' : 'off. switch on'} on={farm.active} onPress={() => toggle(farm)} />
                      {farm.conditionsNote ? <Text style={small}>conditions: {farm.conditionsNote}</Text> : null}
                    </View>
                  )}
                />
                <FarmList title={`waitlist · ${data.counts.waitlist} · declined · ${data.counts.declined}`} farms={data.other} empty="none." />
              </View>
            </View>
            <View style={{ flexDirection: desktop ? 'row' : 'column', gap: desktop ? 28 : 0, marginTop: 8 }}>
              <Rank title="top by units" rows={data.topByUnits} />
              <Rank title="top by revenue" rows={data.topByRevenue} />
            </View>
            <View style={{ marginTop: 28 }}>
              <Cap>repeat buyers</Cap>
              <Text style={quiet}>same email or same phone, two or more test orders. there is no shopper account.</Text>
              {data.repeatBuyers.length === 0 ? <Text style={quiet}>none yet.</Text> : null}
              {data.repeatBuyers.map((buyer) => (
                <View key={`${buyer.email}-${buyer.phone}`} style={card}>
                  <Text style={name}>{buyer.name.toLowerCase() || 'shopper'}</Text>
                  <Text style={small}>{[buyer.email, phoneText(buyer.phone), `${buyer.orders} orders`, dollars(buyer.totalCents)].filter(Boolean).join(' · ')}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 36 }}>
              <Cap>listing drafts</Cap>
              <Text style={quiet}>a private link. the farm approves how the page looks. it does not open orders, and it does not go on the shop.</Text>
              <Pressable onPress={() => router.push('/admin/listing/new')} style={{ marginTop: 12 }}>
                <Text style={{ fontFamily: 'Inter', color: colors.navy, fontWeight: '600' }}>new listing</Text>
              </Pressable>
              <TextInput
                value={csv}
                onChangeText={setCsv}
                placeholder="paste a csv. one row per product."
                placeholderTextColor={colors.gray}
                multiline
                style={[input, { minHeight: 88, marginTop: 16 }]}
              />
              <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
                <Pressable onPress={chooseCsv}><Text style={{ fontFamily: 'Inter', color: colors.gray }}>upload csv</Text></Pressable>
                <Pressable onPress={previewCsv}><Text style={{ fontFamily: 'Inter', color: colors.navy, fontWeight: '600' }}>preview</Text></Pressable>
                {preview ? <Pressable onPress={createDrafts}><Text style={{ fontFamily: 'Inter', color: colors.navy, fontWeight: '600' }}>create drafts</Text></Pressable> : null}
              </View>
              {preview ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={small}>{preview.farms.length} farms. {preview.farms.reduce((sum, farm) => sum + farm.products.length, 0)} products.</Text>
                  {preview.unmatched.length ? <Text style={small}>unmatched: {preview.unmatched.join(', ')}. those use the placeholder photo.</Text> : null}
                  {preview.rowProblems.map((problem) => (
                    <Text key={`${problem.row}-${problem.product}`} style={small}>row {problem.row} {problem.farm} {problem.product}: {problem.problems.join(', ')}</Text>
                  ))}
                </View>
              ) : null}
              {listings.map((listing) => (
                <View key={listing.id} style={card}>
                  <Pressable onPress={() => router.push(`/admin/listing/${listing.id}`)}>
                    <Text style={name}>{listing.farmName.toLowerCase()}{listing.isSample ? ' · sample' : ''}</Text>
                    <Text style={small}>{listing.statusLabel}{listing.changeNote ? ` · ${listing.changeNote}` : ''}{listing.approvedAt ? ` · ${listing.approvedAt.slice(0, 10)}` : ''}</Text>
                    <Text style={small}>{listing.path}</Text>
                  </Pressable>
                  <Pressable onPress={() => copyInvite(listing)} style={{ marginTop: 8 }}>
                    <Text style={{ fontFamily: 'Inter', color: colors.navy, fontWeight: '600' }}>{copied === listing.path ? 'copied' : 'copy text'}</Text>
                  </Pressable>
                  {copied && copied !== listing.path && copied.includes(listing.path) ? <Text style={small}>{copied}</Text> : null}
                </View>
              ))}
            </View>
          </>
        ) : null}
      </Wrap>
    </Shell>
  );
}

function Stat({ label, window }: { label: string; window: WindowTotals }) {
  return (
    <View style={[card, { flex: 1, backgroundColor: colors.cream, borderWidth: 0 }]}>
      <Text style={small}>{label}</Text>
      <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '600', color: colors.navy, marginTop: 6 }}>{dollars(window.totalCents)}</Text>
      <Text style={small}>{window.orders} test order{window.orders === 1 ? '' : 's'} · {dollars(window.merchandiseCents)} to the farms</Text>
    </View>
  );
}

function FarmList({ title, farms, empty, extra }: { title: string; farms: Brief[]; empty: string; extra?: (farm: Brief) => ReactNode }) {
  return (
    <View style={{ marginTop: 28 }}>
      <Cap>{title}</Cap>
      {farms.length === 0 ? <Text style={quiet}>{empty}</Text> : null}
      {farms.map((farm) => (
        <Pressable key={farm.id} onPress={() => router.push(`/admin/${farm.id}`)} style={card}>
          <Text style={name}>{farm.name.toLowerCase()}{farm.isDemo ? ' · sample' : ''}</Text>
          <Text style={small}>{farm.city.toLowerCase()} · {stageLabel.get(farm.stage as 'application_received') || farm.stage}{farm.decision ? ` · ${farm.decision.replace(/_/g, ' ')}` : ''}{farm.paused ? ' · paused' : ''}{farm.removed ? ' · removed' : ''}</Text>
          {farm.overdue ? <Text style={[small, { color: colors.red }]}>{farm.quarterlyOverdue ? 'quarterly re-check overdue' : `overdue${farm.dueAt ? ` · ${farm.dueAt.slice(0, 10)}` : ''}`}</Text> : null}
          {!farm.overdue && farm.dueAt ? <Text style={small}>due {farm.dueAt.slice(0, 10)}</Text> : null}
          {!farm.dueAt && farm.dueWaiting ? <Text style={small}>{farm.dueWaiting}</Text> : null}
          {farm.whatYouSell ? <Text style={small}>{farm.whatYouSell}</Text> : null}
          {extra ? extra(farm) : null}
        </Pressable>
      ))}
    </View>
  );
}

function Rank({ title, rows }: { title: string; rows: Dashboard['topByUnits'] }) {
  return (
    <View style={{ flex: 1, marginTop: 28 }}>
      <Cap>{title}</Cap>
      {rows.length === 0 ? <Text style={quiet}>no test orders yet.</Text> : null}
      {rows.map((row) => (
        <View key={row.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hair }}>
          <Text style={{ fontFamily: 'Inter', color: colors.navy }}>{row.name}</Text>
          <Text style={small}>{row.units} · {dollars(row.revenueCents)}</Text>
        </View>
      ))}
    </View>
  );
}

function phoneText(phone: string): string {
  if (phone.length !== 10) return phone;
  return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
}

const lede = { fontFamily: 'Inter' as const, fontSize: 14, color: colors.ink, marginTop: 10, lineHeight: 21 };
const quiet = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray, marginTop: 10, lineHeight: 18 };
const err = { fontFamily: 'Inter' as const, color: colors.red, marginTop: 12 };
const name = { fontFamily: 'Inter' as const, fontWeight: '600' as const, color: colors.navy };
const small = { fontFamily: 'Inter' as const, fontSize: 12, color: colors.gray, marginTop: 4 };
const input = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.navy, paddingVertical: 8, marginTop: 18 };
const card = { borderWidth: 1, borderColor: colors.hair, borderRadius: 18, padding: 16, marginTop: 12, backgroundColor: colors.white };
const banner = { marginTop: 22, backgroundColor: colors.cream, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16 };
const bannerText = { fontFamily: 'Inter' as const, color: colors.navy, fontSize: 13 };
