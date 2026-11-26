import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, useLayout } from '../theme';
import { usePlace } from '../lib/place';
import { useStore } from '../lib/store';
import { Logo } from './logo';
import { IconBag, IconBarn, IconChevron, IconHome, IconPerson, IconPin, IconSearch } from './icons';

type NavKey = 'browse' | 'farms' | 'standard' | 'farmers' | null;
type TabKey = 'browse' | 'farms' | 'bag' | 'you';

export function Shell({
  nav = null,
  tab,
  showTabs = false,
  top = 'none',
  title,
  right,
  sticky,
  dock,
  mark = false,
  onScroll,
  hideOverlay,
  children,
}: {
  nav?: NavKey;
  tab?: TabKey;
  showTabs?: boolean;
  top?: 'none' | 'browse' | 'overlay' | 'bar';
  title?: string;
  right?: ReactNode;
  sticky?: ReactNode;
  dock?: ReactNode;
  mark?: boolean;
  onScroll?: (y: number) => void;
  hideOverlay?: boolean;
  children: ReactNode;
}) {
  const { desktop } = useLayout();
  const insets = useSafeAreaInsets();
  const tabs = !desktop && showTabs && !!tab;
  const tabSpace = tabs ? 8 + 56 + Math.max(insets.bottom, 12) : Math.max(insets.bottom, 0);
  const dockSpace = !desktop && dock ? 92 : 0;
  const bottomPad = tabs || dock ? tabSpace + dockSpace + 48 : 32 + insets.bottom;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
    >
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      {desktop ? <DesktopNav current={nav} /> : null}
      {!desktop && top === 'browse' ? <MobileBrowseHeader /> : null}
      {!desktop && top === 'bar' ? <BarHeader title={title || ''} mark={mark} /> : null}
      {sticky ? (
        <View style={{
          paddingTop: desktop ? 8 : insets.top + 8,
          paddingBottom: 10,
          paddingRight: desktop ? 28 : 16,
          paddingLeft: 16,
          backgroundColor: colors.white,
          alignItems: 'stretch',
          zIndex: 5,
          shadowColor: '#14213D',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}>
          {sticky}
        </View>
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={onScroll ? (event) => onScroll(event.nativeEvent.contentOffset.y) : undefined}
      >
        {children}
        {desktop ? <Footer /> : null}
      </ScrollView>
      {!desktop && dock ? (
        <View style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: tabSpace,
          paddingTop: 12,
          paddingHorizontal: 20,
          paddingBottom: tabs ? 12 : Math.max(insets.bottom, 12),
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.hair,
        }}>
          {dock}
        </View>
      ) : null}
      {tabs ? <TabBar current={tab!} /> : null}
      {!desktop && top === 'overlay' && !hideOverlay ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', top: Math.max(insets.top, 10), left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <CircleBack />
          <View style={{ flex: 1, marginLeft: 20, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>{right}</View>
        </View>
      ) : null}
    </View>
    </KeyboardAvoidingView>
  );
}

function DesktopNav({ current }: { current: NavKey }) {
  const params = useGlobalSearchParams<{ q?: string }>();
  const initial = typeof params.q === 'string' ? params.q : '';
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial), [initial]);
  const { width } = useLayout();
  return (
    <View style={{ minHeight: 78, borderBottomWidth: 1, borderBottomColor: colors.hair, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', paddingVertical: 12, paddingHorizontal: width > 1200 ? 56 : 28, gap: 14, backgroundColor: colors.white }}>
      {current !== 'browse' ? <View style={{ minWidth: 160 }}><Logo size={16} /></View> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: width > 1100 ? 28 : 16, flexShrink: 1, flex: current === 'browse' ? 1 : undefined }}>
        <NavLink label="browse" on={current === 'browse'} href="/" />
        <NavLink label="farms" on={current === 'farms'} href="/farms" />
        <NavLink label="the main course standard" on={current === 'standard'} href="/standard" />
        <NavLink label="for farmers" on={current === 'farmers'} href="/for-farmers" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: width > 1100 ? 250 : 160, minWidth: 140, maxWidth: 250, flexShrink: 1, height: 44, borderRadius: 999, backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }}>
          <IconSearch size={15} />
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => router.push(text.trim() ? `/?q=${encodeURIComponent(text.trim())}` : '/')}
            placeholder="eggs, honey, a farm, a person"
            placeholderTextColor="#6d7180"
            style={{ flex: 1, fontFamily: 'Inter', fontSize: 12, color: colors.navy, padding: 0 }}
            accessibilityLabel="search"
          />
        </View>
        <Pressable onPress={() => router.push('/you')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <IconPerson size={18} />
          <Text style={{ fontFamily: 'Inter', fontSize: 12.5, fontWeight: '500', color: colors.navy }}>account</Text>
        </Pressable>
        <BagLink />
      </View>
    </View>
  );
}

function NavLink({ label, on, href }: { label: string; on: boolean; href: string }) {
  return (
    <Pressable onPress={() => router.push(href)} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 12.5, fontWeight: on ? '600' : '500', color: on ? colors.navy : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

function BagLink() {
  const { lines } = useStore();
  return (
    <Pressable onPress={() => router.push('/bag')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <IconBag size={18} />
      <Text style={{ fontFamily: 'Inter', fontSize: 12.5, fontWeight: '500', color: colors.navy }}>bag</Text>
      {lines.length ? <Badge n={lines.length} /> : null}
    </Pressable>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <View style={{ minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
      <Text style={{ color: colors.white, fontSize: 9.5, fontWeight: '700', fontFamily: 'Inter' }}>{n}</Text>
    </View>
  );
}

function MobileBrowseHeader() {
  const { openPicker } = usePlace();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 6, backgroundColor: colors.white }}>
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="location pin" onPress={openPicker} hitSlop={12} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <IconPin size={18} />
        </Pressable>
      </View>
    </View>
  );
}

function BarHeader({ title, mark = false }: { title: string; mark?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ minHeight: (mark ? 74 : 58) + insets.top, paddingTop: insets.top, paddingBottom: mark ? 8 : 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: colors.white }}>
      <CircleBack />
      {mark ? (
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Logo size={15} />
          <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.navy }}>{title}</Text>
        </View>
      ) : (
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: 'Inter', fontSize: title.length > 14 ? 13 : 11, fontWeight: '600', letterSpacing: title.length > 14 ? -0.2 : 2, textTransform: title.length > 14 ? 'none' : 'uppercase', color: colors.navy }}>{title}</Text>
      )}
      <View style={{ width: 44 }} />
    </View>
  );
}

export function CircleBack() {
  return (
    <Pressable
      accessibilityLabel="back"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={6}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: colors.hair, alignItems: 'center', justifyContent: 'center' }}
    >
      <IconChevron left />
    </Pressable>
  );
}

function TabBar({ current }: { current: TabKey }) {
  const insets = useSafeAreaInsets();
  const { lines } = useStore();
  const items: { key: TabKey; label: string; icon: ReactNode; href: string }[] = [
    { key: 'browse', label: 'browse', icon: <IconHome color={current === 'browse' ? colors.navy : colors.gray} />, href: '/' },
    { key: 'farms', label: 'farms', icon: <IconBarn color={current === 'farms' ? colors.navy : colors.gray} />, href: '/farms' },
    { key: 'bag', label: 'bag', icon: <IconBag color={current === 'bag' ? colors.navy : colors.gray} />, href: '/bag' },
    { key: 'you', label: 'you', icon: <IconPerson color={current === 'you' ? colors.navy : colors.gray} />, href: '/you' },
  ];
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 12), paddingTop: 8, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.hair, flexDirection: 'row', justifyContent: 'space-around' }}>
      {items.map((item) => (
        <Pressable key={item.key} onPress={() => router.push(item.href)} style={{ width: 72, height: 56, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <View>
            {item.icon}
            {item.key === 'bag' && lines.length ? (
              <View style={{ position: 'absolute', top: -4, right: -8 }}><Badge n={lines.length} /></View>
            ) : null}
          </View>
          <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '500', color: current === item.key ? colors.navy : colors.gray }}>{item.label}</Text>
          {current === item.key ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.navy }} /> : <View style={{ height: 4 }} />}
        </Pressable>
      ))}
    </View>
  );
}

function Footer() {
  return (
    <View style={{ marginTop: 100, borderTopWidth: 1, borderTopColor: colors.hair, paddingTop: 48, paddingBottom: 42, alignItems: 'center' }}>
      <Logo size={14} />
      <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#6d7180', marginTop: 16, textAlign: 'center', paddingHorizontal: 24 }}>we make the luxury of eating clean accessible.</Text>
      <View style={{ flexDirection: 'row', gap: 26, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 24 }}>
        <FooterLink label="the main course standard" href="/standard" />
        <FooterLink label="for farmers" href="/for-farmers" />
        <FooterLink label="sell with us" href="/reps" />
        <Pressable onPress={() => Linking.openURL('https://instagram.com/themainzco')} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={foot}>instagram @themainzco</Text>
        </Pressable>
        <FooterLink label="help" href="/help" />
      </View>
      <Text style={{ fontFamily: 'Inter', fontSize: 10, color: '#a3a7b2', marginTop: 22, textAlign: 'center', paddingHorizontal: 24 }}>sample farms, so you can look around.</Text>
    </View>
  );
}

const foot = { fontFamily: 'Inter' as const, fontSize: 11, color: colors.gray };

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <Pressable onPress={() => router.push(href)} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={foot}>{label}</Text>
    </Pressable>
  );
}
