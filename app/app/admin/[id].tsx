import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  DECISIONS,
  DOCUMENTS,
  DOCUMENT_STATUSES,
  PIPELINE_STAGES,
  SCORE_MARKS,
  STANDARDS,
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
  };
  scoreLine: string;
  scores: Score[];
  documents: Doc[];
  activity: Activity[];
};

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

              <View style={{ marginTop: 32 }}><Cap>pipeline</Cap></View>
              <TextInput value={stageNote} onChangeText={setStageNote} placeholder="optional note for this move" placeholderTextColor={colors.gray} style={input} />
              <View style={pills}>
                {PIPELINE_STAGES.map((stage) => (
                  <Pill key={stage.key} label={stage.label} on={farm.stage === stage.key} onPress={() => post(`/api/admin/farms/${farm.id}/stage`, { stage: stage.key, note: stageNote })} />
                ))}
              </View>

              <View style={{ marginTop: 32 }}><Cap>standards</Cap></View>
              <Text style={meta}>{data.scoreLine}</Text>
              {scores.map((score, index) => (
                <View key={score.key} style={block}>
                  <Text style={rowTitle}>{label(STANDARDS, score.key)}</Text>
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
