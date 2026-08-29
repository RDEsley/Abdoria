import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fateeight.evolyn',
  appName: 'Evolyn',
  webDir: 'client/dist',
  backgroundColor: '#f4faf7',
  android: { backgroundColor: '#f4faf7', allowMixedContent: false },
  ios: { backgroundColor: '#f4faf7', contentInset: 'automatic' },
  plugins: {
    SplashScreen: { launchAutoHide: true, backgroundColor: '#f4faf7', showSpinner: false },
    StatusBar: { style: 'DARK', backgroundColor: '#f4faf7', overlaysWebView: false },
    Keyboard: { resize: 'native', style: 'LIGHT' },
    LocalNotifications: { iconColor: '#0A9875' },
  },
};

export default config;
