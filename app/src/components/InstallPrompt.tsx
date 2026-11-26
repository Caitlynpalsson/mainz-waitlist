import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { colors } from '../theme';

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt() {
  const [event, setEvent] = useState<PromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    if (window.matchMedia('(display-mode: standalone)').matches) return undefined;
    try {
      if (localStorage.getItem('mainz.install.hidden') === '1') return undefined;
    } catch { /* still offer it */ }
    setHidden(false);
    const onPrompt = (next: Event) => {
      next.preventDefault();
      setEvent(next as PromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (hidden || Platform.OS !== 'web') return null;
  if (!event && typeof window !== 'undefined' && !/iphone|ipad/i.test(window.navigator.userAgent)) return null;

  function dismiss() {
    setHidden(true);
    try { localStorage.setItem('mainz.install.hidden', '1'); } catch { /* fine */ }
  }

  return (
    <View accessibilityRole="summary" accessibilityLabel="add the main course to your home screen" style={bar}>
      <Text style={copy}>add the main course to your home screen.</Text>
      {event ? (
        <Pressable accessibilityRole="button" accessibilityLabel="add to home screen" onPress={() => { void event.prompt().then(dismiss); }} style={button}>
          <Text style={buttonText}>add</Text>
        </Pressable>
      ) : <Text style={hint}>tap share, then add to home screen.</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel="not now" onPress={dismiss} style={hit}>
        <Text style={hint}>not now</Text>
      </Pressable>
    </View>
  );
}

const bar = { position: 'fixed' as 'absolute', left: 12, right: 12, bottom: 24, zIndex: 30, backgroundColor: colors.cream, borderRadius: 18, padding: 14, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, flexWrap: 'wrap' as const };
const copy = { fontFamily: 'Inter' as const, fontSize: 14, color: colors.navy, flexGrow: 1 };
const hint = { fontFamily: 'Inter' as const, fontSize: 13, color: colors.gray };
const button = { backgroundColor: colors.navy, borderRadius: 999, minHeight: 36, paddingHorizontal: 14, justifyContent: 'center' as const };
const buttonText = { fontFamily: 'Inter' as const, color: colors.cream, fontWeight: '600' as const };
const hit = { minHeight: 36, justifyContent: 'center' as const };
