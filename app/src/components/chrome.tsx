import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, useLayout } from '../theme';
import { useStore } from '../lib/store';
import { Logo } from './logo';
import { IconBag, IconBarn, IconBell, IconChevron, IconHome, IconPerson, IconPin, IconSearch } from './icons';

type NavKey = 'browse' | 'farms' | 'standard' | 'farmers' | null;
type TabKey = 'browse' | 'farms' | 'bag' | 'you';

export function Shell({
  nav = null,
  tab,
  showTabs = false,
  top = 'none',
  title,
  right,
  children,
}: {
  nav?: NavKey;
  tab?: TabKey;
  showTabs?: boolean;
  top?: 'none' | 'browse' | 'overlay' | 'bar';
  title?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const { desktop } = useLayout();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      {desktop ? <DesktopNav current={nav} /> : null}
      {!desktop && top === 'browse' ? <MobileBrowseHeader /> : null}
      {!desktop && top === 'bar' ? <BarHeader title={title || ''} /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: !desktop && showTabs ? 96 + insets.bottom : 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
        {desktop ? <Footer /> : null}
      </ScrollView>
      {!desktop && showTabs && tab ? <TabBar current={tab} /> : null}
      {!desktop && top === 'overlay' ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', top: Math.max(insets.top, 10), left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <CircleBack />
          <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View>
        </View>
      ) : null}
    </View>
  );
}

function DesktopNav({ current }: { current: NavKey }) {
  const params = useGlobalSearchParams<{ q?: string }>();
  const initial = typeof params.q === 'string' ? params.q : '';
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial), [initial]);
  const { width } = useLayout();
  return (
    <View style={{ height: 78, borderBottomWidth: 1, borderBottomColor: colors.hair, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: width > 1200 ? 56 : 28, gap: 18, backgroundColor: colors.white }}>
      <View style={{ width: 150 }}><Logo size={12} /></View>
      <View style={{ flexDirection: 'row', gap: width > 1100 ? 32 : 18 }}>
        <NavLink label="browse" on={current === 'browse'} href="/" />
        <NavLink label="farms" on={current === 'farms'} href="/farms" />
        <NavLink label="the mainz standard" on={current === 'standard'} href="/standard" />
        <NavLink label="for farmers" on={current === 'farmers'} href="/for-farmers" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: width > 1100 ? 250 : 180, height: 38, borderRadius: 999, backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }}>
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
    <Pressable onPress={() => router.push(href)}>
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
  const [note, setNote] = useState(false);
  return (
    <View style={{ paddingTop: 8, paddingHorizontal: 18, paddingBottom: 6, backgroundColor: colors.white }}>
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconPin size={18} />
        <Logo size={13} />
        <Pressable onPress={() => setNote(true)} accessibilityLabel="notes">
          <IconBell />
          <View style={{ position: 'absolute', top: -1, right: -1, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.red }} />
        </Pressable>
      </View>
      {note ? <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.gray, textAlign: 'center', marginBottom: 6 }}>no notes yet.</Text> : null}
    </View>
  );
}

function BarHeader({ title }: { title: string }) {
  return (
    <View style={{ height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
      <CircleBack />
      <Text style={{ flex: 1, textAlign: 'center', fontFamily: 'Inter', fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: colors.navy }}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );
}

export function CircleBack() {
  return (
    <Pressable
      accessibilityLabel="back"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: colors.hair, alignItems: 'center', justifyContent: 'center' }}
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
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.hair, flexDirection: 'row', justifyContent: 'space-around' }}>
      {items.map((item) => (
        <Pressable key={item.key} onPress={() => router.push(item.href)} style={{ width: 64, alignItems: 'center', gap: 4 }}>
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
      <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#6d7180', marginTop: 16 }}>we make the luxury of eating clean accessible.</Text>
      <View style={{ flexDirection: 'row', gap: 26, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
        <FooterLink label="the mainz standard" href="/standard" />
        <FooterLink label="for farmers" href="/for-farmers" />
        <Pressable onPress={() => Linking.openURL('https://instagram.com/themainzco')}>
          <Text style={foot}>instagram @themainzco</Text>
        </Pressable>
        <FooterLink label="help" href="/help" />
      </View>
      <Text style={{ fontFamily: 'Inter', fontSize: 10, color: '#a3a7b2', marginTop: 22 }}>sample farms, made up for the mockup.</Text>
    </View>
  );
}

const foot = { fontFamily: 'Inter' as const, fontSize: 11, color: colors.gray };

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <Pressable onPress={() => router.push(href)}>
      <Text style={foot}>{label}</Text>
    </Pressable>
  );
}
