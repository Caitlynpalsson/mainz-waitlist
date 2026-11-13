import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../src/lib/store';

export default function RootLayout() {
  const [ready] = useFonts({
    Inter: require('../assets/fonts/Inter.ttf'),
    Scr: require('../assets/fonts/MonsieurLaDoulaise-Regular.ttf'),
  });
  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ffffff' } }} />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
