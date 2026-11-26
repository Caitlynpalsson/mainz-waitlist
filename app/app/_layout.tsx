import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InstallPrompt } from '../src/components/InstallPrompt';
import { SiteExtras } from '../src/components/SiteExtras';
import { LocationSheet } from '../src/components/LocationSheet';
import { bootNative } from '../src/lib/nativeShell';
import { PlaceProvider } from '../src/lib/place';
import { StoreProvider } from '../src/lib/store';

export default function RootLayout() {
  const [ready] = useFonts({
    Inter: require('../assets/fonts/Inter.ttf'),
    Scr: require('../assets/fonts/MonsieurLaDoulaise-Regular.ttf'),
  });
  useEffect(() => {
    void bootNative((path) => router.push(path as never));
  }, []);
  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <PlaceProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ffffff' } }} />
          <LocationSheet />
          <InstallPrompt />
          <SiteExtras />
        </PlaceProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
