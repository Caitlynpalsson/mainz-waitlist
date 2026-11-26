import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../../src/components/chrome';
import { PrimaryButton, Wrap } from '../../../src/components/ui';
import { api } from '../../../src/lib/api';
import { dollars } from '../../../src/lib/money';
import { SITE_ORIGIN } from '../../../src/lib/site';
import { FARM_PITCH, PAYOUT_PLACEHOLDER, SHOPPER_PITCH, friendlyStanding } from '../../../../api/src/reps';
import { ONBOARDING_SMS, ONBOARDING_TEXT_US } from '../../../../api/src/listing';
import { qrMatrix } from '../../../../api/src/qr';
import { repGuideFacts } from '../../../../api/src/guide';
import { SetupGuide } from '../../../src/components/SetupGuide';
import { colors, useLayout } from '../../../src/theme';

type Farm = { name: string; status: string; soldCents: number; commissionCents: number | null; sample: boolean };
type Board = { label: string; farms: number; shoppers: number; you: boolean; hidden: boolean };
type Desk = {
  name: string;
  code: string;
  sample: boolean;
  applyPath: string;
  shortPath: string;
  shopperPath: string;
  ratePercent: number | null;
  payoutNote: string;
  earnings: { monthCents: number; allTimeCents: number; pendingCents: number; paidCents: number };
  farms: Farm[];
  shoppersBrought: number;
  ledger: { at: string; farmName: string; salesCents: number; commissionCents: number; paid: boolean }[];
  leaderboardOptOut: boolean;
  weeklyGoal: number;
  weekProgress: number;
  badges: { earned: { id: string; label: string }[]; next: { label: string; current: number; target: number } | null };
  leaderboard: { month: Board[]; allTime: Board[] };
};

export default function RepDesk() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { desktop } = useLayout();
  const [data, setData] = useState<Desk | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [tab, setTab] = useState<'home' | 'share' | 'paid'>('home');
  const [taps, setTaps] = useState(0);

  useEffect(() => {
    if (!token) return;
    api<Desk>(`/api/reps/desk/${token}`)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [token]);

  useEffect(() => {
    if (!data) return;
    try { setTaps(Number(localStorage.getItem(`mainz.rep.taps.${data.code}`) || 0)); } catch { /* still fine */ }
  }, [data]);

  async function save(patch: { leaderboardOptOut?: boolean }) {
    if (!token) return;
    const next = await api<Desk>(`/api/reps/desk/${token}`, { method: 'POST', body: JSON.stringify(patch) });
    setData(next);
  }

  function bumpTaps() {
    if (!data) return;
    const next = taps + 1;
    setTaps(next);
    try { localStorage.setItem(`mainz.rep.taps.${data.code}`, String(next)); } catch { /* still counted this visit */ }
  }

  const link = data ? `${SITE_ORIGIN}${data.shortPath}` : '';
  const farmText = data ? `${FARM_PITCH} ${link}` : '';
  const shopperText = data ? `${SHOPPER_PITCH} ${SITE_ORIGIN}${data.shopperPath}` : '';
  const sales = data?.farms.reduce((sum, farm) => sum + farm.soldCents, 0) || 0;
  const earned = data?.earnings.allTimeCents || 0;
  const empty = !data?.farms.length;
  const rank = data && !data.leaderboardOptOut
    ? data.leaderboard.month.findIndex((row) => row.you) + 1
    : 0;

  return (
    <Shell top="bar" title="your desk">
      <Wrap style={{ paddingTop: desktop ? 64 : 24 }}>
        <View style={{ maxWidth: 560, alignSelf: 'center', width: '100%' }}>
          {error ? <Text style={err}>{error}</Text> : null}
          {!data && !error ? <Text style={quiet}>loading.</Text> : null}
          {data ? (
            <>
              <View style={tabs}>
                {(['home', 'share', 'paid'] as const).map((item) => (
                  <Pressable key={item} accessibilityRole="button" onPress={() => setTab(item)} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={tab === item ? name : quiet}>{item}</Text>
                  </Pressable>
                ))}
              </View>
              {tab === 'home' ? (
                <>
                  <Text style={headline}>{data.ratePercent == null ? 'your rate is on its way' : `you earn ${data.ratePercent}% of what your farms sell, forever`}</Text>
                  <Text style={quiet}>next payout is monday, {nextMondayLabel()}.</Text>
                  <View style={{ marginTop: 18 }}>
                    <PrimaryButton label="invite a farm" onPress={() => { bumpTaps(); void shareText(farmText, setNote); }} />
                  </View>
                  {empty ? <Text style={body}>invite your first farm.</Text> : null}
                  <View style={tileRow}>
                    <Tile label="link taps" value={String(taps)} />
                    <Tile label="farms" value={String(data.farms.length)} />
                    <Tile label="sales" value={sales ? dollars(sales) : 'none yet'} />
                    <Tile label="your 3%" value={earned ? dollars(earned) : 'starts with a farm'} />
                  </View>
                  <Text style={kicker}>your farms</Text>
                  {empty ? <Text style={body}>when a farm uses your link, they show up here.</Text> : null}
                  {data.farms.map((farm) => (
                    <View key={farm.name} style={card}>
                      <Text style={name}>{farm.name.toLowerCase()}{farm.sample ? ' · sample' : ''}</Text>
                      <Text style={quiet}>{friendlyStanding(farm.status)}</Text>
                      <Pressable accessibilityRole="button" onPress={() => remind(farm.name, link)} style={{ minHeight: 44, justifyContent: 'center' }}>
                        <Text style={linkText}>send a reminder</Text>
                      </Pressable>
                    </View>
                  ))}
                  <Text style={quiet}>{data.shoppersBrought ? `${data.shoppersBrought} shoppers stopped by. that is a nice extra, not part of your pay.` : 'shoppers who join are a nice extra. they do not change what you earn.'}</Text>
                  <View style={chipRow}>
                    {data.badges.earned.map((badge) => <Text key={badge.id} style={chip}>{badge.label}</Text>)}
                  </View>
                  {rank > 0 ? (
                    <Pressable onPress={() => save({ leaderboardOptOut: true })}>
                      <Text style={quiet}>you are #{rank} this month. tap to step off the board.</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => save({ leaderboardOptOut: false })}>
                      <Text style={linkText}>show me on the board</Text>
                    </Pressable>
                  )}
                </>
              ) : null}
              {tab === 'share' ? (
                <>
                  <View style={card}>
                    <Text style={name}>invite a farm</Text>
                    <Text style={body}>{farmText}</Text>
                    <Pressable accessibilityRole="button" onPress={() => { bumpTaps(); void shareText(farmText, setNote); }}><Text style={linkText}>share</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => { bumpTaps(); copy(farmText, setNote); }}><Text style={linkText}>copy</Text></Pressable>
                  </View>
                  <View style={card}>
                    <Text style={name}>invite shoppers</Text>
                    <Text style={body}>{shopperText}</Text>
                    <Pressable accessibilityRole="button" onPress={() => { bumpTaps(); void shareText(shopperText, setNote); }}><Text style={linkText}>share</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => { bumpTaps(); copy(shopperText, setNote); }}><Text style={linkText}>copy</Text></Pressable>
                  </View>
                  <Text style={quiet}>a quiet code, if you want it on paper.</Text>
                  <QrMark text={link} />
                  <Pressable onPress={() => downloadCard('story', data.name, link)}><Text style={quiet}>save a story image</Text></Pressable>
                </>
              ) : null}
              {tab === 'paid' ? (
                <>
                  <Text style={headline}>every monday, lands in 1 to 3 days</Text>
                  <Text style={body}>{data.payoutNote || PAYOUT_PLACEHOLDER}</Text>
                  {data.ledger.length === 0 ? <Text style={quiet}>not set up yet. we'll set this up with you.</Text> : null}
                  <Text style={quiet}>pending stays pending until monday. if one fails, we will say why.</Text>
                  {data.ledger.map((row) => (
                    <Text key={`${row.at}-${row.farmName}`} style={quiet}>
                      {row.farmName.toLowerCase()} · {dollars(row.commissionCents)} · {row.paid ? `paid ${friendlyWhen(row.at)}` : 'pending'}
                    </Text>
                  ))}
                </>
              ) : null}
              {note ? <Text style={toast}>{note}</Text> : null}
            </>
          ) : null}
        </View>
      </Wrap>
      {data && token ? (
        <SetupGuide
          audience="rep"
          accountId={token}
          facts={repGuideFacts({ farms: data.farms.length, shoppers: data.shoppersBrought })}
          hrefFor={(stepId) => stepId === 'farm' ? data.applyPath : stepId === 'shoppers' ? data.shopperPath : `/reps/desk/${token}?guide=${stepId}`}
          onOpen={(stepId) => {
            if (stepId === 'share') void copy(`${FARM_PITCH} ${link}`, setNote);
          }}
        />
      ) : null}
      <Pressable accessibilityRole="link" accessibilityLabel={`text us at ${ONBOARDING_TEXT_US}`} onPress={() => Linking.openURL(ONBOARDING_SMS).catch(() => undefined)} style={sticky}>
        <Text style={linkText}>text us {ONBOARDING_TEXT_US}</Text>
      </Pressable>
    </Shell>
  );
}

function nextMondayLabel(): string {
  const now = new Date();
  const add = (8 - now.getUTCDay()) % 7;
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + add));
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }).toLowerCase();
}

function friendlyWhen(value: string): string {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).toLowerCase();
}

function remind(farmName: string, link: string) {
  const text = `hi, checking in about ${farmName.toLowerCase()} on the main course. your page is here: ${link}`;
  const sms = `sms:?&body=${encodeURIComponent(text)}`;
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({ text }).catch(() => Linking.openURL(sms).catch(() => undefined));
    return;
  }
  Linking.openURL(sms).catch(() => undefined);
}

async function shareText(text: string, setNote: (value: string) => void) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text });
      setNote('shared');
      return;
    } catch { /* copy is still there */ }
  }
  copy(text, setNote);
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={tile}>
      <Text style={quiet}>{label}</Text>
      <Text style={name}>{value}</Text>
    </View>
  );
}

function QrMark({ text }: { text: string }) {
  let grid: boolean[][] = [];
  try { grid = text ? qrMatrix(text) : []; } catch { grid = []; }
  if (!grid.length) return null;
  const cell = 4;
  return (
    <View style={{ alignSelf: 'center', marginTop: 16, backgroundColor: colors.white, padding: 10 }}>
      {grid.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {row.map((on, x) => <View key={x} style={{ width: cell, height: cell, backgroundColor: on ? colors.navy : colors.white }} />)}
        </View>
      ))}
    </View>
  );
}

function copy(text: string, setNote: (value: string) => void) {
  const clip = globalThis.navigator?.clipboard;
  if (!clip) {
    setNote('copied');
    return;
  }
  clip.writeText(text).then(() => setNote('copied')).catch(() => setNote('copied'));
}

function downloadCard(kind: 'card' | 'story', name: string, url: string) {
  if (typeof document === 'undefined') return;
  const story = kind === 'story';
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = story ? 1920 : 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#F3F0E4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#14213D';
  ctx.font = '600 64px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('the main course', 540, story ? 220 : 160);
  ctx.font = '400 32px Inter, sans-serif';
  ctx.fillText(name.toLowerCase(), 540, story ? 290 : 220);
  let grid: boolean[][] = [];
  try { grid = qrMatrix(url); } catch { grid = []; }
  const cell = story ? 14 : 12;
  const side = grid.length * cell;
  const left = (1080 - side) / 2;
  const top = story ? 420 : 300;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(left - 24, top - 24, side + 48, side + 48);
  grid.forEach((row, y) => row.forEach((on, x) => {
    if (!on) return;
    ctx.fillStyle = '#14213D';
    ctx.fillRect(left + x * cell, top + y * cell, cell, cell);
  }));
  ctx.fillStyle = '#14213D';
  ctx.font = '400 28px Inter, sans-serif';
  ctx.fillText('real food from people with names', 540, canvas.height - 120);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/jpeg', 0.92);
  link.download = story ? 'main-course-story.jpg' : 'main-course-card.jpg';
  link.click();
}

const headline = { fontFamily: 'Inter' as const, fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.6, color: colors.navy, textAlign: 'center' as const };
const big = { fontFamily: 'Inter' as const, fontSize: 40, fontWeight: '600' as const, color: colors.navy, textAlign: 'center' as const, marginTop: 8 };
const kicker = { fontFamily: 'Inter' as const, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: colors.gray, textAlign: 'center' as const, marginTop: 36 };
const body = { fontFamily: 'Inter' as const, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center' as const, marginTop: 12 };
const quiet = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 8 };
const err = { fontFamily: 'Inter' as const, color: colors.gray, textAlign: 'center' as const };
const tabs = { flexDirection: 'row' as const, justifyContent: 'space-around' as const, marginBottom: 12 };
const tileRow = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'center' as const, gap: 10, marginTop: 18 };
const tile = { width: 140, padding: 12, borderRadius: 16, backgroundColor: colors.cream, alignItems: 'center' as const };
const chipRow = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'center' as const, gap: 8, marginTop: 16 };
const chip = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.navy, backgroundColor: colors.cream, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, overflow: 'hidden' as const };
const toast = { fontFamily: 'Inter' as const, fontSize: 14, color: colors.navy, textAlign: 'center' as const, marginTop: 16 };
const sticky = { position: 'absolute' as const, left: 0, right: 0, bottom: 12, alignItems: 'center' as const };
const name = { fontFamily: 'Inter' as const, fontSize: 16, fontWeight: '600' as const, color: colors.navy, textAlign: 'center' as const };
const card = { marginTop: 18, padding: 18, borderRadius: 18, backgroundColor: colors.cream };
const linkText = { fontFamily: 'Inter' as const, fontSize: 15, color: colors.navy, textAlign: 'center' as const, marginTop: 14, textDecorationLine: 'underline' as const };
