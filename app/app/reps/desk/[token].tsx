import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../../src/components/chrome';
import { PrimaryButton, Wrap } from '../../../src/components/ui';
import { api } from '../../../src/lib/api';
import { dollars } from '../../../src/lib/money';
import { SITE_ORIGIN } from '../../../src/lib/site';
import { FARM_PITCH, PAYOUT_PLACEHOLDER, RATE_COMING, SHOPPER_PITCH } from '../../../../api/src/reps';
import { ONBOARDING_SMS } from '../../../../api/src/listing';
import { qrMatrix } from '../../../../api/src/qr';
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
  const [goal, setGoal] = useState('');
  const [note, setNote] = useState('');
  const [board, setBoard] = useState<'month' | 'all'>('month');

  useEffect(() => {
    if (!token) return;
    api<Desk>(`/api/reps/desk/${token}`)
      .then((next) => { setData(next); setGoal(next.weeklyGoal ? String(next.weeklyGoal) : ''); })
      .catch((err: Error) => setError(err.message));
  }, [token]);

  async function save(patch: { weeklyGoal?: number; leaderboardOptOut?: boolean }) {
    if (!token) return;
    const next = await api<Desk>(`/api/reps/desk/${token}`, { method: 'POST', body: JSON.stringify(patch) });
    setData(next);
    setNote('saved.');
  }

  const link = data ? `${SITE_ORIGIN}${data.shortPath}` : '';
  const rateLine = data?.ratePercent == null
    ? RATE_COMING
    : `how much do i earn: ${data.ratePercent}% of what your farms sell, for as long as they sell.`;

  return (
    <Shell top="bar" title="your desk">
      <Wrap style={{ paddingTop: desktop ? 64 : 24 }}>
        <View style={{ maxWidth: 560, alignSelf: 'center', width: '100%' }}>
          {error ? <Text style={err}>{error}</Text> : null}
          {!data && !error ? <Text style={quiet}>loading.</Text> : null}
          {data ? (
            <>
              <Text style={headline}>{data.name.toLowerCase()}</Text>
              {data.sample ? <Text style={quiet}>sample rep, for a look around.</Text> : null}
              <Text style={kicker}>this month</Text>
              <Text style={big}>{dollars(data.earnings.monthCents)}</Text>
              <Text style={quiet}>all time {dollars(data.earnings.allTimeCents)}</Text>
              <Text style={quiet}>pending {dollars(data.earnings.pendingCents)} · paid {dollars(data.earnings.paidCents)}</Text>
              <Text style={quiet}>next payout is a monday. {data.payoutNote || PAYOUT_PLACEHOLDER}</Text>
              <GoalRing goal={data.weeklyGoal} progress={data.weekProgress} />
              <TextInput value={goal} onChangeText={setGoal} placeholder="weekly goal" placeholderTextColor={colors.gray} keyboardType="number-pad" style={field} />
              <View style={{ marginTop: 12 }}>
                <PrimaryButton label="save goal" onPress={() => save({ weeklyGoal: Math.max(0, Math.min(500, Number(goal) || 0)) })} />
              </View>

              <Text style={kicker}>my farms</Text>
              {data.farms.length === 0 ? <Text style={body}>no farms yet.</Text> : null}
              {data.farms.map((farm) => (
                <View key={farm.name} style={card}>
                  <Text style={name}>{farm.name.toLowerCase()}{farm.sample ? ' · sample' : ''}</Text>
                  <Text style={quiet}>{farm.status}</Text>
                  <Text style={quiet}>sales {dollars(farm.soldCents)}</Text>
                  <Text style={quiet}>{farm.commissionCents == null ? RATE_COMING : `your share ${dollars(farm.commissionCents)}`}</Text>
                </View>
              ))}
              <Text style={quiet}>shoppers you brought {data.shoppersBrought}. no cash for shoppers, just the board.</Text>

              <Text style={kicker}>share</Text>
              <Text style={quiet}>{link}</Text>
              <QrMark text={link} />
              <Text style={body}>{FARM_PITCH} {link}</Text>
              <Text style={body}>{SHOPPER_PITCH} {SITE_ORIGIN}{data.shopperPath}</Text>
              <View style={{ marginTop: 12 }}>
                <PrimaryButton label="copy farm text" onPress={() => copy(`${FARM_PITCH} ${link}`, setNote)} />
              </View>
              <View style={{ marginTop: 12 }}>
                <PrimaryButton label="copy shopper text" onPress={() => copy(`${SHOPPER_PITCH} ${SITE_ORIGIN}${data.shopperPath}`, setNote)} />
              </View>
              <View style={{ marginTop: 12 }}>
                <PrimaryButton label="download qr card" onPress={() => downloadCard('card', data.name, link)} />
              </View>
              <View style={{ marginTop: 12 }}>
                <PrimaryButton label="download story image" onPress={() => downloadCard('story', data.name, link)} />
              </View>

              <Text style={kicker}>payouts</Text>
              <Text style={body}>{data.payoutNote || PAYOUT_PLACEHOLDER}</Text>
              {data.ledger.length === 0 ? <Text style={quiet}>nothing paid out yet.</Text> : null}
              {data.ledger.map((row) => (
                <Text key={`${row.at}-${row.farmName}`} style={quiet}>
                  {row.farmName.toLowerCase()} · {dollars(row.commissionCents)} · {row.paid ? 'paid' : 'pending'}
                </Text>
              ))}

              <Text style={kicker}>help</Text>
              <Pressable onPress={() => Linking.openURL(ONBOARDING_SMS).catch(() => undefined)}>
                <Text style={linkText}>text us at 972-510-3326</Text>
              </Pressable>
              <Text style={body}>{rateLine}</Text>

              <Text style={kicker}>badges</Text>
              {data.badges.earned.length === 0 ? <Text style={quiet}>your first farm is the first badge.</Text> : null}
              {data.badges.earned.map((badge) => <Text key={badge.id} style={quiet}>{badge.label}</Text>)}
              {data.badges.next ? (
                <Text style={body}>{data.badges.next.current} of {data.badges.next.target} toward {data.badges.next.label}</Text>
              ) : <Text style={quiet}>you cleared the board.</Text>}

              <Text style={kicker}>leaderboard</Text>
              <Pressable onPress={() => save({ leaderboardOptOut: !data.leaderboardOptOut })}>
                <Text style={linkText}>{data.leaderboardOptOut ? 'you are hidden. tap to show your name' : 'show my name. tap to hide'}</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 12 }}>
                <Pressable onPress={() => setBoard('month')}><Text style={board === 'month' ? name : quiet}>this month</Text></Pressable>
                <Pressable onPress={() => setBoard('all')}><Text style={board === 'all' ? name : quiet}>all time</Text></Pressable>
              </View>
              {(board === 'month' ? data.leaderboard.month : data.leaderboard.allTime).map((row) => (
                <Text key={row.label + String(row.you)} style={quiet}>
                  {row.label}{row.you ? ' · you' : ''}{row.hidden ? ' · hidden' : ''} · {row.farms} farms · {row.shoppers} shoppers
                </Text>
              ))}
              {note ? <Text style={quiet}>{note}</Text> : null}
            </>
          ) : null}
        </View>
      </Wrap>
    </Shell>
  );
}

function GoalRing({ goal, progress }: { goal: number; progress: number }) {
  const size = 92;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = goal > 0 ? Math.max(0, Math.min(1, progress / goal)) : 0;
  return (
    <View style={{ alignItems: 'center', marginTop: 22 }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.peri} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.navy}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c * ratio} ${c}`}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={quiet}>{goal ? `${progress} of ${goal} this week` : 'set a small weekly goal'}</Text>
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
    setNote(text);
    return;
  }
  clip.writeText(text).then(() => setNote('copied.')).catch(() => setNote(text));
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
const err = { fontFamily: 'Inter' as const, color: colors.red, textAlign: 'center' as const };
const name = { fontFamily: 'Inter' as const, fontSize: 16, fontWeight: '600' as const, color: colors.navy, textAlign: 'center' as const };
const card = { marginTop: 18, padding: 18, borderRadius: 18, backgroundColor: colors.cream };
const field = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, textAlign: 'center' as const, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 10, marginTop: 16 };
const linkText = { fontFamily: 'Inter' as const, fontSize: 15, color: colors.navy, textAlign: 'center' as const, marginTop: 14, textDecorationLine: 'underline' as const };
