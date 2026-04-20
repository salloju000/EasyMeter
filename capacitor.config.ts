import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easymeter.app',
  appName: 'EasyMeter',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
