import { appPathFromUrl, isNativeShell, isStripeUrl, PUSH_ENABLED } from '../../../api/src/nativeLinks';
import { Linking } from 'react-native';

export async function openUrl(url: string): Promise<void> {
  if (isNativeShell() && isStripeUrl(url)) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  }
  await Linking.openURL(url);
}

/** Status bar, safe return from Stripe, and deep links. Push is compiled but not requested. */
export async function bootNative(openPath: (path: string) => void): Promise<void> {
  if (!isNativeShell()) return;
  const [{ StatusBar, Style }, { App }, { Browser }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/app'),
    import('@capacitor/browser'),
  ]);
  await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);
  await StatusBar.setBackgroundColor({ color: '#14213D' }).catch(() => undefined);
  await StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
  await App.addListener('appUrlOpen', async ({ url }) => {
    const path = appPathFromUrl(url);
    if (!path) return;
    await Browser.close().catch(() => undefined);
    openPath(path);
  });
  if (PUSH_ENABLED) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.register();
  }
}
