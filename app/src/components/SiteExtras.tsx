import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { api } from '../lib/api';

type Config = { turnstileSiteKey?: string; analyticsToken?: string };

export function SiteExtras() {
  const [token, setToken] = useState('');
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    api<Config>('/api/config').then((config) => {
      const beacon = config.analyticsToken || '';
      if (!beacon || typeof document === 'undefined') return;
      setToken(beacon);
      if (document.getElementById('cf-beacon')) return;
      const script = document.createElement('script');
      script.id = 'cf-beacon';
      script.defer = true;
      script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      script.setAttribute('data-cf-beacon', JSON.stringify({ token: beacon }));
      document.body.appendChild(script);
    }).catch(() => undefined);
  }, []);
  return token ? null : null;
}

export function TurnstileField({ onToken }: { onToken: (token: string) => void }) {
  const [siteKey, setSiteKey] = useState('');
  useEffect(() => {
    api<Config>('/api/config').then((config) => setSiteKey(config.turnstileSiteKey || '')).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!siteKey || Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    if (!document.getElementById('cf-turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      document.head.appendChild(script);
    }
    const timer = setInterval(() => {
      const box = document.getElementById('turnstile-box');
      const turnstile = (window as { turnstile?: { render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => void } }).turnstile;
      if (!box || !turnstile || box.dataset.ready === '1') return;
      box.dataset.ready = '1';
      turnstile.render(box, { sitekey: siteKey, callback: onToken });
      clearInterval(timer);
    }, 300);
    return () => clearInterval(timer);
  }, [siteKey, onToken]);
  if (!siteKey) return null;
  return <View nativeID="turnstile-box" style={{ minHeight: 70, marginTop: 12 }} />;
}
