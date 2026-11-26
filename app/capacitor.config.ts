import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.themaincoursemarket.app',
  appName: 'The Main Course',
  webDir: 'dist',
  ios: { contentInset: 'automatic' },
  android: { backgroundColor: '#F3F0E4' },
  plugins: {
    SplashScreen: {
      backgroundColor: '#F3F0E4',
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#14213D',
    },
    PushNotifications: {
      presentationOptions: [],
    },
  },
};

export default config;
