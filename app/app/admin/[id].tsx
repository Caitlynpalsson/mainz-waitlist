import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  CALL_OPENING,
  CALL_QUESTIONS,
  CALL_SHARE,
  DECISIONS,
  DOCUMENTS,
  DOCUMENT_STATUSES,
  ONBOARDING_ITEMS,
  PIPELINE_STAGES,
  QUARTERLY_STEPS,
  QUICK_SCREEN,
  SCORE_MARKS,
  SCORE_READING,
  STANDARDS,
  TEMPLATES,
  WEEKLY_CHECKS,
  fillTemplate,
} from '../../../api/src/review';
import { Shell } from '../../src/components/chrome';
import { Cap, Pill, PrimaryButton, Wrap } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { adminHeaders, useAdminToken } from '../../src/lib/adminAuth';
import { colors, useLayout } from '../../src/theme';

type Score = { key: string; mark: string; note: string };
type Doc = { key: string; status: string; note: string; expiresOn: string; hinted: boolean };
type Activity = { id: number; kind: string; from: string; to: string; note: string; createdAt: string };
type Review = {
  farm: {
    id: number;
    name: string;
    farmerNames: string;
    email: string;
    phone: string;
    city: string;
    whatYouSell: string;
    sellNow: string;
    fulfillmentPref: string;
    link: string;
    status: string;
    active: boolean;
    isDemo: boolean;
    accessToken: string | null;
    stage: string;
    decision: string;
  decisionNote: string;
  conditionsNote: string;
  summary: string;
  sampleReceivedAt: string;
  visitedOn: string;
  pauseReason: string;
  removeReason: string;
  onboarding: Record<string, boolean>;
  dueAt: string | null;
  overdue: boolean;
  waiting: string;
  quarterlyDueAt: string | null;
  quarterlyOverdue: boolean;
  };
  scoreLine: string;
  scores: Score[];
  documents: Doc[];
  products: UdafProduct[];
  activity: Activity[];
};
type UdafProduct = { id: number; name: string; active: boolean; needsUdaf: boolean; udafOn: boolean; udafDetail: string; udafDocument: string };

const label = (list: readonly { key: string; label: string }[], key: string) => list.find((item) => item.key === key)?.label || key.replace(/_/g, ' ');

export default function AdminFarm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { desktop } = useLayout();
  const auth = useAdminToken();
  const [data, setData] = useState<Review | null>(null);
  const [error, setError] = useState('');
  const [stageNote, setStageNote] = useState('');
  const [summary, setSummary] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [scores, setScores] = useState<Score[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    if (!auth.token || !id) return;
    load(auth.token);
  }, [auth.token, id]);

  async function load(current: string) {
    setError('');
    try {
      const next = await api<Review>(`/api/admin/farms/${id}`, { headers: adminHeaders(current) });
      setData(next);
      setSummary(next.farm.summary);
      setScores(next.scores);
      setDocs(next.documents);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'could not open that farm.');
    }
  }

  async function post(path: string, body: unknown) {
    if (!auth.token) return;
    setError('');
    try {
      await api(path, { method: 'POST', headers: adminHeaders(auth.token), body: JSON.stringify(body) });
      setStageNote('');
      await load(auth.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'that did not work.');
    }
  }

  const farm = data?.farm;

  return (
    <Shell top="bar" title="review">
      <Wrap style={{ paddingTop: desktop ? 36 : 8 }}>
        <View style={{ maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          {!auth.token ? (
            <>
              <Cap>admin</Cap>
              <TextInput value={auth.draft} onChangeText={auth.setDraft} placeholder="admin token" placeholderTextColor={colors.gray} secureTextEntry autoCapitalize="none" style={input} />
              <View style={{ marginTop: 12, maxWidth: 220 }}>
                <PrimaryButton label="open the desk" onPress={() => { auth.save().catch(() => undefined); }} />
              </View>
            </>
          ) : null}
          {error ? <Text style={err}>{error}</Text> : null}
          {farm ? (
            <>
              <Cap>{farm.city.toLowerCase()} · {label(PIPELINE_STAGES, farm.stage)}</Cap>
              <Text style={title}>{farm.name.toLowerCase()}{farm.isDemo ? ' · sample' : ''}</Text>
              <Text style={meta}>{[farm.farmerNames, farm.email, farm.phone].filter(Boolean).join(' · ')}</Text>
              <Text style={meta}>{farm.whatYouSell}{farm.sellNow ? ` · ${farm.sellNow}` : ''} · {farm.fulfillmentPref}</Text>
              {farm.link ? <Text style={meta}>{farm.link}</Text> : null}
              <Text style={meta}>{farm.status}{farm.active ? ' · on the site' : ' · hidden'}{farm.decision ? ` · ${label(DECISIONS, farm.decision)}` : ''}</Text>
              {farm.conditionsNote ? (
                <View style={noteBox}>
                  <Text style={noteLabel}>conditions</Text>
                  <Text style={body}>{farm.conditionsNote}</Text>
                </View>
              ) : null}
              {farm.decisionNote && farm.decision !== 'approve_conditions' ? <Text style={meta}>note: {farm.decisionNote}</Text> : null}
              {farm.accessToken ? <Text style={meta}>dashboard token {farm.accessToken}</Text> : null}
              {farm.overdue ? <Text style={[meta, { color: colors.red }]}>{farm.quarterlyOverdue ? 'quarterly re-check is overdue.' : `overdue${farm.dueAt ? ` · ${farm.dueAt.slice(0, 10)}` : ''}`}</Text> : null}
              {!farm.overdue && farm.dueAt ? <Text style={meta}>due {farm.dueAt.slice(0, 10)}. {PIPELINE_STAGES.find((stage) => stage.key === farm.stage)?.goal}</Text> : null}
              {farm.waiting ? <Text style={meta}>{farm.waiting}</Text> : null}
              {farm.quarterlyDueAt && !farm.quarterlyOverdue ? <Text style={meta}>quarterly re-check due {farm.quarterlyDueAt.slice(0, 10)}</Text> : null}
              {farm.pauseReason ? <Text style={meta}>paused: {farm.pauseReason}</Text> : null}
              {farm.removeReason ? <Text style={meta}>removed: {farm.removeReason}</Text> : null}
              {farm.visitedOn ? <Text style={meta}>visited {farm.visitedOn}. only say we visited when this date is here.</Text> : null}

              <CopyBlock title="message to copy" text={messageFor(farm, data.documents)} />

              {farm.stage === 'quick_screen' ? (
                <View style={block}>
                  {QUICK_SCREEN.map((item) => (
                    <View key={item.key} style={{ marginTop: 10 }}>
                      <Text style={rowTitle}>{item.title}</Text>
                      {item.lines.map((line) => <Text key={line} style={meta}>{line}</Text>)}
                    </View>
                  ))}
                </View>
              ) : null}

              {farm.stage === 'intro_call' ? (
                <View style={block}>
                  <Text style={rowTitle}>15 minutes. phone is best. a dm works.</Text>
                  <CopyBlock title="opening" text={fillTemplate(CALL_OPENING, fieldsFor(farm))} />
                  {CALL_QUESTIONS.map((question, index) => <Text key={question} style={meta}>{index + 1}. {question}</Text>)}
                  <Text style={[rowTitle, { marginTop: 12 }]}>then share</Text>
                  {CALL_SHARE.map((line) => <Text key={line} style={meta}>{line}</Text>)}
                </View>
              ) : null}

              {farm.stage === 'sample_review' ? (
                <View style={{ marginTop: 12, maxWidth: 280 }}>
                  <PrimaryButton label={farm.sampleReceivedAt ? `sample in · ${farm.sampleReceivedAt.slice(0, 10)}` : 'mark the sample or photos received'} onPress={() => post(`/api/admin/farms/${farm.id}/sample`, { at: '' })} />
                </View>
              ) : null}

              {(farm.stage === 'onboarding' || farm.stage === 'ongoing') ? (
                <View style={block}>
                  <Text style={rowTitle}>onboarding</Text>
                  <Text style={meta}>goal: live within 2 weeks of approval. payouts are later.</Text>
                  {ONBOARDING_ITEMS.map((item) => (
                    <View key={item.key} style={{ marginTop: 8 }}>
                      <Pill label={item.label} on={!!farm.onboarding[item.key]} onPress={() => post(`/api/admin/farms/${farm.id}/onboarding`, { key: item.key, done: !farm.onboarding[item.key] })} />
                    </View>
                  ))}
                </View>
              ) : null}

              {farm.stage === 'ongoing' ? (
                <View style={block}>
                  <Text style={rowTitle}>this week</Text>
                  {WEEKLY_CHECKS.map((line) => <Text key={line} style={meta}>{line}</Text>)}
                  <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                    <Pill label="weekly check done" on onPress={() => post(`/api/admin/farms/${farm.id}/weekly`, {})} />
                  </View>
                  <Text style={[rowTitle, { marginTop: 14 }]}>quarterly re-check</Text>
                  {QUARTERLY_STEPS.map((line) => <Text key={line} style={meta}>{line}</Text>)}
                  <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                    <Pill label="quarterly re-check done" on onPress={() => post(`/api/admin/farms/${farm.id}/recheck`, {})} />
                  </View>
                </View>
              ) : null}

              {farm.status === 'approved' ? (
                <View style={block}>
                  <Text style={rowTitle}>{farm.active ? 'on the site' : 'hidden'}</Text>
                  {!farm.active && !farm.removeReason ? (
                    <View style={{ marginTop: 8, maxWidth: 220 }}><PrimaryButton label="go live" onPress={() => post(`/api/admin/farms/${farm.id}/live`, {})} /></View>
                  ) : null}
                  <TextInput value={decisionNote} onChangeText={setDecisionNote} placeholder="reason to pause or remove" placeholderTextColor={colors.gray} style={input} />
                  <View style={pills}>
                    {farm.pauseReason ? <Pill label="resume" on onPress={() => post(`/api/admin/farms/${farm.id}/pause`, { resume: true, reason: decisionNote })} /> : <Pill label="pause" onPress={() => post(`/api/admin/farms/${farm.id}/pause`, { reason: decisionNote })} />}
                    <Pill label="remove" onPress={() => post(`/api/admin/farms/${farm.id}/remove`, { reason: decisionNote })} />
                  </View>
                </View>
              ) : null}

              <View style={{ marginTop: 32 }}><Cap>pipeline</Cap></View>
              <TextInput value={stageNote} onChangeText={setStageNote} placeholder="optional note for this move" placeholderTextColor={colors.gray} style={input} />
              <View style={pills}>
                {PIPELINE_STAGES.map((stage) => (
                  <Pill key={stage.key} label={stage.label} on={farm.stage === stage.key} onPress={() => post(`/api/admin/farms/${farm.id}/stage`, { stage: stage.key, note: stageNote })} />
                ))}
              </View>

              <View style={{ marginTop: 32 }}><Cap>standards</Cap></View>
              <Text style={meta}>{data.scoreLine}</Text>
              {SCORE_READING.map((line) => <Text key={line} style={meta}>{line}</Text>)}
              {scores.map((score, index) => (
                <View key={score.key} style={block}>
                  <Text style={rowTitle}>{label(STANDARDS, score.key)}</Text>
                  <Text style={meta}>{STANDARDS.find((item) => item.key === score.key)?.look}</Text>
                  <View style={pills}>
                    {SCORE_MARKS.map((mark) => (
                      <Pill
                        key={mark.key}
                        small
                        label={mark.label}
                        on={score.mark === mark.key}
                        onPress={() => setScores((current) => current.map((row, i) => i === index ? { ...row, mark: mark.key } : row))}
                      />
                    ))}
                  </View>
                  <TextInput
                    value={score.note}
                    onChangeText={(note) => setScores((current) => current.map((row, i) => i === index ? { ...row, note } : row))}
                    placeholder="note"
                    placeholderTextColor={colors.gray}
                    style={input}
                  />
                  <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                    <Pill label="save score" on onPress={() => post(`/api/admin/farms/${farm.id}/score`, { standard: score.key, mark: score.mark, note: score.note })} />
                  </View>
                </View>
              ))}
              <Text style={[rowTitle, { marginTop: 18 }]}>overall summary</Text>
              <TextInput value={summary} onChangeText={setSummary} placeholder="the short version" placeholderTextColor={colors.gray} multiline style={[input, { minHeight: 64 }]} />
              <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                <Pill label="save summary" on onPress={() => post(`/api/admin/farms/${farm.id}/summary`, { summary })} />
              </View>

              <View style={{ marginTop: 32 }}><Cap>utah documents</Cap></View>
              <Text style={meta}>a hint is a guess from what they sell. you set the status.</Text>
              {docs.map((doc, index) => (
                <View key={doc.key} style={block}>
                  <Text style={rowTitle}>{label(DOCUMENTS, doc.key)}{doc.hinted ? ' · likely' : ''}</Text>
                  <View style={pills}>
                    {DOCUMENT_STATUSES.map((status) => (
                      <Pill
                        key={status.key}
                        small
                        label={status.label}
                        on={doc.status === status.key}
                        onPress={() => setDocs((current) => current.map((row, i) => i === index ? { ...row, status: status.key } : row))}
                      />
                    ))}
                  </View>
                  <TextInput
                    value={doc.note}
                    onChangeText={(note) => setDocs((current) => current.map((row, i) => i === index ? { ...row, note } : row))}
                    placeholder="note"
                    placeholderTextColor={colors.gray}
                    style={input}
                  />
                  <TextInput
                    value={doc.expiresOn}
                    onChangeText={(expiresOn) => setDocs((current) => current.map((row, i) => i === index ? { ...row, expiresOn } : row))}
                    placeholder="expiry, 2027-06-01"
                    placeholderTextColor={colors.gray}
                    autoCapitalize="none"
                    style={input}
                  />
                  <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                    <Pill
                      label="save document"
                      on={!!doc.status}
                      onPress={() => post(`/api/admin/farms/${farm.id}/document`, { key: doc.key, status: doc.status, note: doc.note, expiresOn: doc.expiresOn })}
                    />
                  </View>
                </View>
              ))}

              {data.products.some((product) => product.needsUdaf) ? (
                <View style={block}>
                  <Text style={rowTitle}>needs udaf check</Text>
                  <Text style={meta}>raw milk and homemade food act / cottage food stay off until the matching document is verified and you turn the item on.</Text>
                  {data.products.filter((product) => product.needsUdaf).map((product) => (
                    <View key={product.id} style={{ marginTop: 10 }}>
                      <Text style={body}>{product.name} · {product.udafDetail}{product.udafOn ? ' · on the shop' : ' · hidden'}</Text>
                      <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                        <Pill
                          label={product.udafOn ? 'turn off' : 'verify and turn on'}
                          on={product.udafOn}
                          onPress={() => post(`/api/admin/farms/${farm.id}/products/${product.id}/udaf`, { on: !product.udafOn })}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={{ marginTop: 32 }}><Cap>decision</Cap></View>
              <TextInput value={decisionNote} onChangeText={setDecisionNote} placeholder="conditions, or a reason. required for approve with conditions." placeholderTextColor={colors.gray} multiline style={[input, { minHeight: 64 }]} />
              <View style={pills}>
                {DECISIONS.map((item) => (
                  <Pill key={item.key} label={item.label} on={farm.decision === item.key} onPress={() => post(`/api/admin/farms/${farm.id}/decision`, { decision: item.key, note: decisionNote })} />
                ))}
              </View>

              <View style={{ marginTop: 32 }}><Cap>activity</Cap></View>
              {data.activity.length === 0 ? <Text style={meta}>nothing logged yet.</Text> : null}
              {data.activity.map((row) => (
                <View key={row.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hair }}>
                  <Text style={meta}>{row.createdAt} · {row.kind} · {row.from || '—'} → {row.to || '—'}</Text>
                  {row.note ? <Text style={body}>{row.note}</Text> : null}
                </View>
              ))}
            </>
          ) : null}
        </View>
      </Wrap>
    </Shell>
  );
}

function fieldsFor(farm: Review['farm']) {
  const first = farm.farmerNames.trim().split(/\s+/)[0] || '';
  return {
    firstName: first,
    farmName: farm.name,
    condition: farm.conditionsNote,
    reason: farm.decisionNote || farm.pauseReason || farm.removeReason,
    items: farm.whatYouSell,
    product: farm.whatYouSell,
  };
}

function messageFor(farm: Review['farm'], documents: Doc[]): string {
  const key = farm.stage === 'application_received' ? 'thanks'
    : farm.stage === 'documents' ? 'documents'
    : farm.stage === 'sample_review' ? 'sample'
    : farm.stage === 'ongoing' ? (farm.pauseReason ? 'pause' : 'check_in')
    : farm.decision || 'thanks';
  const template = TEMPLATES.find((item) => item.key === key) || TEMPLATES[0];
  const hinted = documents.filter((doc) => doc.hinted).map((doc) => label(DOCUMENTS, doc.key)).join(', ');
  return fillTemplate(template.text, { ...fieldsFor(farm), items: hinted || farm.whatYouSell });
}

function CopyBlock({ title, text }: { title: string; text: string }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={noteLabel}>{title}. select to copy. nothing is emailed.</Text>
      <TextInput multiline editable={false} selectTextOnFocus value={text} style={[input, { minHeight: 72 }]} />
    </View>
  );
}

const title = { fontFamily: 'Inter' as const, fontSize: 28, fontWeight: '600' as const, color: colors.navy, marginTop: 8 };
const meta = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.gray, marginTop: 6, lineHeight: 18 };
const body = { fontFamily: 'Inter' as const, fontSize: 14, color: colors.navy, marginTop: 4, lineHeight: 20 };
const err = { fontFamily: 'Inter' as const, color: colors.red, marginTop: 12 };
const rowTitle = { fontFamily: 'Inter' as const, fontSize: 14, fontWeight: '600' as const, color: colors.navy };
const input = { fontFamily: 'Inter' as const, fontSize: 15, color: colors.navy, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingVertical: 8, marginTop: 8 };
const pills = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginTop: 12 };
const block = { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.hair };
const noteBox = { marginTop: 14, backgroundColor: colors.cream, borderRadius: 16, padding: 14 };
const noteLabel = { fontFamily: 'Inter' as const, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: colors.gray };
