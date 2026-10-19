import type { CapacitorConfig } from '@capacitor/cli'

// De Sneppe Kassa — app voor de winkelier (bestelbord, automatisch printen, meldingen bij nieuwe bestellingen).
// Bouwen: kopieer dit bestand over capacitor.config.ts (gebeurt automatisch in Codemagic).
const url = process.env.SNEPPE_APP_URL || 'https://de-sneppe.be'

const config: CapacitorConfig = {
  appId: 'be.desneppe.kassa',
  appName: 'De Sneppe Kassa',
  webDir: 'app-shell',
  backgroundColor: '#141414',
  appendUserAgent: 'DeSneppeKassa',
  server: {
    url: `${url}/kassa`,
    cleartext: false,
    allowNavigation: ['sneppe.beehive.be', 'de-sneppe.be', 'www.de-sneppe.be'],
    errorPath: 'offline.html',
  },
  ios: { contentInset: 'never', scheme: 'De Sneppe Kassa', path: 'ios-kassa' },
  android: { path: 'android-kassa', allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 1500, launchAutoHide: true, backgroundColor: '#141414', showSpinner: false },
    StatusBar: { style: 'DARK', backgroundColor: '#141414', overlaysWebView: false },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
}

export default config
