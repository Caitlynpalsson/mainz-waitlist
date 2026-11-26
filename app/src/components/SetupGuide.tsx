import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  GUIDE_SMS,
  GUIDE_TEXT_US,
  cannedAnswerer,
  guideStorageKey,
  guideView,
  markGuideStep,
  readGuideState,
  searchFaqs,
  type GuideAnswerer,
  type GuideAudience,
  type GuideFacts,
  type GuideState,
} from '../../../api/src/guide';
import { colors, useLayout } from '../theme';

export function SetupGuide({
  audience,
  accountId,
  facts,
  hrefFor,
  onOpen,
  answerer = cannedAnswerer(),
}: {
  audience: GuideAudience;
  accountId: string;
  facts: GuideFacts;
  hrefFor?: (stepId: string) => string;
  onOpen?: (stepId: string) => void;
  answerer?: GuideAnswerer;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useLayout();
  const narrow = width < 720;
  const key = guideStorageKey(audience, accountId);
  const [state, setState] = useState<GuideState | null>(null);
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState('');
  const [reply, setReply] = useState('');

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(key).then((raw) => {
      if (!live) return;
      const next = readGuideState(raw, audience);
      setState(next);
      setOpen(!next.dismissed);
    }).catch(() => {
      if (!live) return;
      const next = readGuideState(null, audience);
      setState(next);
      setOpen(!next.dismissed);
    });
    return () => { live = false; };
  }, [key, audience]);

  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function save(next: GuideState) {
    setState(next);
    AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => undefined);
  }

  if (!state) return null;
  const view = guideView(audience, facts, state);
  const faqs = searchFaqs(audience, ask);
  const bottom = Math.max(insets.bottom, 12) + 12;

  function openStep(stepId: string) {
    const next = markGuideStep(state as GuideState, stepId, audience);
    save(next);
    onOpen?.(stepId);
    const href = hrefFor?.(stepId);
    if (href) router.push(href as never);
  }

  async function submitAsk() {
    const result = await answerer.answer({ audience, question: ask, stepId: view.current.id });
    setReply(result.text);
  }

  const pin = (Platform.OS === 'web' ? 'fixed' : 'absolute') as 'absolute';
  return (
    <View pointerEvents="box-none">
      {open ? (
        <View
          accessibilityViewIsModal
          accessibilityRole="summary"
          accessibilityLabel="setup helper"
          style={{
            position: pin,
            left: narrow ? 12 : undefined,
            right: 12,
            bottom,
            width: narrow ? undefined : 380,
            maxHeight: '78%',
            zIndex: 40,
            backgroundColor: colors.cream,
            borderRadius: 24,
            padding: 18,
            borderWidth: 1,
            borderColor: 'rgba(159,187,224,0.9)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={kicker}>setup {view.doneCount} of {view.total}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="close setup helper" onPress={() => setOpen(false)} hitSlop={8} style={hit}>
              <Text style={quiet}>close</Text>
            </Pressable>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: view.total, now: view.doneCount }}
            style={{ height: 6, borderRadius: 99, backgroundColor: colors.white, marginTop: 10, overflow: 'hidden' }}
          >
            <View style={{ width: `${view.total ? (view.doneCount / view.total) * 100 : 0}%`, height: 6, backgroundColor: colors.peri }} />
          </View>
          <Text style={title}>{view.complete ? 'you are set' : view.current.title}</Text>
          <Text style={body}>{view.complete ? 'nice work. text the team if a step feels stuck.' : view.current.tip}</Text>
          {view.complete ? null : (
            <Pressable accessibilityRole="button" accessibilityLabel={view.current.action} onPress={() => openStep(view.current.id)} style={action}>
              <Text style={actionText}>{view.current.action}</Text>
            </Pressable>
          )}
          <View style={{ marginTop: 14 }}>
            {view.steps.map((step) => (
              <Pressable key={step.id} accessibilityRole="button" accessibilityState={{ selected: step.id === view.current.id }} accessibilityLabel={`${step.title}${step.done ? ', done' : ''}`} onPress={() => openStep(step.id)} style={{ paddingVertical: 6 }}>
                <Text style={step.done ? done : item}>{step.done ? 'done' : 'next'} · {step.title}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={ask}
            onChangeText={setAsk}
            onSubmitEditing={() => { void submitAsk(); }}
            placeholder="ask a short question"
            placeholderTextColor={colors.gray}
            autoCapitalize="none"
            accessibilityLabel="search setup questions"
            style={field}
          />
          {(ask.trim() ? faqs : faqs.slice(0, 3)).map((item) => (
            <Text key={item.id} style={faq}>{item.q} {item.a}</Text>
          ))}
          {ask.trim() && faqs.length === 0 ? <Text style={faq}>{reply || 'text the team and a person will help.'}</Text> : null}
          {reply && faqs.length > 0 ? <Text style={faq}>{reply}</Text> : null}
          <Pressable accessibilityRole="link" accessibilityLabel={`text the team at ${GUIDE_TEXT_US}`} onPress={() => Linking.openURL(GUIDE_SMS).catch(() => undefined)} style={{ marginTop: 8, minHeight: 44, justifyContent: 'center' }}>
            <Text style={link}>text the team {GUIDE_TEXT_US}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="hide setup helper" onPress={() => { save({ ...state, dismissed: true }); setOpen(false); }} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={quiet}>hide for now</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={state.dismissed ? 'show setup helper' : `setup helper, ${view.doneCount} of ${view.total}`}
          accessibilityState={{ expanded: false }}
          onPress={() => { save({ ...state, dismissed: false }); setOpen(true); }}
          style={{
            position: pin,
            right: 16,
            bottom,
            zIndex: 40,
            backgroundColor: colors.navy,
            borderRadius: 999,
            paddingVertical: 12,
            paddingHorizontal: 16,
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: colors.cream }}>setup {view.doneCount}/{view.total}</Text>
        </Pressable>
      )}
    </View>
  );
}

const kicker = { fontFamily: 'Inter' as const, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: colors.navy };
const title = { fontFamily: 'Inter' as const, fontSize: 22, fontWeight: '600' as const, color: colors.navy, marginTop: 12 };
const body = { fontFamily: 'Inter' as const, fontSize: 14, lineHeight: 20, color: colors.ink, marginTop: 6 };
const action = { marginTop: 12, backgroundColor: colors.navy, borderRadius: 999, minHeight: 44, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 16 };
const actionText = { fontFamily: 'Inter' as const, fontSize: 15, fontWeight: '600' as const, color: colors.white };
const item = { fontFamily: 'Inter' as const, fontSize: 14, color: colors.navy };
const done = { fontFamily: 'Inter' as const, fontSize: 14, color: colors.gray };
const quiet = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.gray };
const faq = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.ink, marginTop: 8 };
const link = { fontFamily: 'Inter' as const, fontSize: 14, color: colors.navy, textDecorationLine: 'underline' as const };
const field = { fontFamily: 'Inter' as const, fontSize: 15, color: colors.navy, borderBottomWidth: 1, borderBottomColor: 'rgba(20,33,61,0.15)', paddingVertical: 8, marginTop: 8 };
const hit = { minHeight: 44, justifyContent: 'center' as const, paddingHorizontal: 8 };
