import { useState } from 'react';
import { Linking, Pressable, Text, TextInput, View, type TextStyle } from 'react-native';
import {
  ONBOARDING_DONE,
  ONBOARDING_SMS,
  ONBOARDING_STEPS,
  ONBOARDING_TEXT_LINE,
  ONBOARDING_TEXT_US,
  ONBOARDING_WELCOME,
  PAY_PREF_LABELS,
  PAY_PREFS,
  PAY_STEP_LINE,
  PAY_STEP_TITLE,
  type OnboardingStep,
  type PayPref,
} from '../../../api/src/listing';
import { colors } from '../theme';
import { FoodImage, Pill, PrimaryButton } from './ui';

export type OnboardingAnswers = {
  reachVia: '' | 'text' | 'email';
  reachEmail: string;
  payPref: '' | PayPref;
  pickupNote: string;
  pickupOk: boolean;
};

export function FarmOnboarding({
  step,
  answers,
  pickupLines,
  photo,
  preview,
  busy,
  error,
  onBack,
  onSeePage,
  onNext,
}: {
  step: OnboardingStep;
  answers: OnboardingAnswers;
  pickupLines: string[];
  photo?: string;
  preview: boolean;
  busy: boolean;
  error: string;
  onBack: () => void;
  onSeePage: () => void;
  onNext: (patch: Partial<OnboardingAnswers> & { done?: boolean; reachPhone?: string }) => void;
}) {
  const [via, setVia] = useState(answers.reachVia || 'email');
  const [email, setEmail] = useState(answers.reachEmail);
  const [phone, setPhone] = useState('');
  const [pay, setPay] = useState<PayPref>(answers.payPref || 'set this up later');
  const [editing, setEditing] = useState(false);
  const [pickupText, setPickupText] = useState(answers.pickupNote || pickupLines.join('\n'));
  const shown = answers.pickupNote || pickupLines.join('\n');

  return (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', alignItems: 'center', paddingTop: 12 }}>
      {step === 'welcome' ? (
        <>
          <Text style={headline}>{ONBOARDING_WELCOME}</Text>
          <View style={{ marginTop: 28, width: '100%' }}>
            <PrimaryButton label="let's go" onPress={() => onNext({})} />
          </View>
        </>
      ) : null}
      {step === 'reach' ? (
        <>
          <Text style={headline}>how should we reach you?</Text>
          <View style={row}>
            <Pill cream={via !== 'text'} on={via === 'text'} label="text" onPress={() => setVia('text')} />
            <Pill cream={via !== 'email'} on={via === 'email'} label="email" onPress={() => setVia('email')} />
          </View>
          {via === 'email' ? (
            <TextInput value={email} onChangeText={setEmail} placeholder="email" placeholderTextColor={colors.gray} autoCapitalize="none" keyboardType="email-address" accessibilityLabel="email" style={field} />
          ) : (
            <TextInput value={phone} onChangeText={setPhone} placeholder="your number" placeholderTextColor={colors.gray} keyboardType="phone-pad" accessibilityLabel="your number" style={field} />
          )}
          <View style={{ marginTop: 28, width: '100%' }}>
            <PrimaryButton label={busy ? 'saving…' : 'next'} disabled={busy} onPress={() => onNext({ reachVia: via, reachEmail: email, reachPhone: via === 'text' ? phone : '' })} />
          </View>
        </>
      ) : null}
      {step === 'pay' ? (
        <>
          <Text style={headline}>{PAY_STEP_TITLE}</Text>
          <Text style={quiet}>{PAY_STEP_LINE}</Text>
          <View style={{ width: '100%', gap: 8, marginTop: 22 }}>
            {PAY_PREFS.map((choice) => {
              const on = pay === choice;
              return (
                <Pressable
                  key={choice}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setPay(choice)}
                  style={{ minHeight: 44, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, backgroundColor: on ? colors.navy : colors.cream, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, lineHeight: 20, fontWeight: on ? '600' : '500', color: on ? colors.white : colors.navy, textAlign: 'center' }}>{PAY_PREF_LABELS[choice]}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: 28, width: '100%' }}>
            <PrimaryButton label={busy ? 'saving…' : 'next'} disabled={busy} onPress={() => onNext({ payPref: pay })} />
          </View>
        </>
      ) : null}
      {step === 'pickup' ? (
        <>
          <Text style={headline}>when can shoppers pick up?</Text>
          {editing ? (
            <TextInput value={pickupText} onChangeText={setPickupText} multiline placeholder="pickup times" placeholderTextColor={colors.gray} accessibilityLabel="pickup times" style={[field, { minHeight: 96, textAlign: 'left' }]} />
          ) : (
            <Text style={body}>{shown || 'by appointment'}</Text>
          )}
          <View style={{ marginTop: 28, width: '100%' }}>
            <PrimaryButton
              label={editing ? (busy ? 'saving…' : 'save') : 'looks right'}
              disabled={busy}
              onPress={() => onNext(editing ? { pickupOk: false, pickupNote: pickupText } : { pickupOk: true, pickupNote: '' })}
            />
          </View>
          {!editing ? (
            <Pressable onPress={() => setEditing(true)} style={{ marginTop: 16 }}>
              <Text style={link}>edit</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
      {step === 'done' ? (
        <>
          {photo ? (
            <View style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.cream, marginBottom: 8 }}>
              <FoodImage photo={photo} name="" width={72} height={72} />
            </View>
          ) : (
            <View style={check}>
              <Text style={{ fontFamily: 'Inter', fontSize: 22, color: colors.navy }}>✓</Text>
            </View>
          )}
          <Text style={headline}>you're all set</Text>
          <Text style={body}>{ONBOARDING_DONE}</Text>
          <TextUsLine style={body} />
          <View style={{ marginTop: 28, width: '100%' }}>
            <PrimaryButton label="see my page" onPress={onSeePage} />
          </View>
        </>
      ) : null}
      {error ? <Text style={{ ...quiet, color: colors.red }}>{error}</Text> : null}
      <Pressable onPress={onBack} style={{ marginTop: 22 }}>
        <Text style={link}>back</Text>
      </Pressable>
    </View>
  );
}

export function TextUsLine({ style }: { style?: TextStyle }) {
  const [before, after] = ONBOARDING_TEXT_LINE.split(ONBOARDING_TEXT_US);
  return (
    <Text style={style}>
      {before}
      <Text
        accessibilityRole="link"
        onPress={() => Linking.openURL(ONBOARDING_SMS).catch(() => undefined)}
        style={{ color: colors.navy }}
      >
        {ONBOARDING_TEXT_US}
      </Text>
      {after}
    </Text>
  );
}

export function nextOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_STEPS.indexOf(step);
  return index >= 0 && index < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[index + 1] : null;
}

export function prevOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_STEPS.indexOf(step);
  return index > 0 ? ONBOARDING_STEPS[index - 1] : null;
}

const headline = { fontFamily: 'Inter' as const, fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.6, lineHeight: 34, color: colors.navy, textAlign: 'center' as const };
const body = { fontFamily: 'Inter' as const, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center' as const, marginTop: 16 };
const quiet = { fontFamily: 'Inter' as const, fontSize: 13, lineHeight: 18, color: colors.gray, textAlign: 'center' as const, marginTop: 12 };
const link = { fontFamily: 'Inter' as const, fontSize: 14, color: colors.gray };
const check = { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.cream, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 8 };
const row = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'center' as const, gap: 8, marginTop: 22 };
const field = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, textAlign: 'center' as const, backgroundColor: colors.cream, borderRadius: 16, borderWidth: 1, borderColor: colors.hair, paddingVertical: 14, paddingHorizontal: 16, marginTop: 18, width: '100%' as const };
