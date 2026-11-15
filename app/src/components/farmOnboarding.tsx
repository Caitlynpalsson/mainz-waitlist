import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import {
  ONBOARDING_DONE,
  ONBOARDING_STEPS,
  ONBOARDING_WELCOME,
  PAY_PREFS,
  onboardingQuestions,
  type OnboardingStep,
  type PayPref,
} from '../../../api/src/listing';
import { colors } from '../theme';
import { Pill, PrimaryButton } from './ui';

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
  preview,
  busy,
  error,
  onBack,
  onNext,
}: {
  step: OnboardingStep;
  answers: OnboardingAnswers;
  pickupLines: string[];
  preview: boolean;
  busy: boolean;
  error: string;
  onBack: () => void;
  onNext: (patch: Partial<OnboardingAnswers> & { done?: boolean; reachPhone?: string }) => void;
}) {
  const [via, setVia] = useState(answers.reachVia || 'email');
  const [email, setEmail] = useState(answers.reachEmail);
  const [phone, setPhone] = useState('');
  const [pay, setPay] = useState<'' | PayPref>(answers.payPref);
  const [editing, setEditing] = useState(false);
  const [pickupText, setPickupText] = useState(answers.pickupNote || pickupLines.join('\n'));
  const shown = answers.pickupNote || pickupLines.join('\n');

  return (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', alignItems: 'center', paddingTop: 12 }}>
      {preview ? <Text style={quiet}>preview of this step. nothing is saved.</Text> : null}
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
          <Text style={headline}>how do you want to get paid?</Text>
          <Text style={quiet}>a preference only. no bank details, and nothing is charged.</Text>
          <View style={row}>
            {PAY_PREFS.map((choice) => (
              <Pill key={choice} cream={pay !== choice} on={pay === choice} label={choice} onPress={() => setPay(choice)} />
            ))}
          </View>
          <View style={{ marginTop: 28, width: '100%' }}>
            <PrimaryButton label={busy ? 'saving…' : 'next'} disabled={busy || !pay} onPress={() => onNext({ payPref: pay })} />
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
          <Text style={headline}>you're all set</Text>
          <Text style={body}>{ONBOARDING_DONE}</Text>
          <Text style={body}>{onboardingQuestions()}</Text>
        </>
      ) : null}
      {error ? <Text style={{ ...quiet, color: colors.red }}>{error}</Text> : null}
      <Pressable onPress={onBack} style={{ marginTop: 22 }}>
        <Text style={link}>back</Text>
      </Pressable>
    </View>
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
const row = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'center' as const, gap: 8, marginTop: 22 };
const field = { fontFamily: 'Inter' as const, fontSize: 16, color: colors.navy, textAlign: 'center' as const, backgroundColor: colors.cream, borderRadius: 16, borderWidth: 1, borderColor: colors.hair, paddingVertical: 14, paddingHorizontal: 16, marginTop: 18, width: '100%' as const };
