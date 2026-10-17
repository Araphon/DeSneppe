import type { CapacitorConfig } from '@capacitor/cli'

// De app laadt de live website (sneppe.beehive.be, later de-sneppe.be): inhoud en functies
// updaten zonder nieuwe app-versie. Enkel native wijzigingen (plugins, iconen) vragen een nieuwe build.
const url = process.env.SNEPPE_APP_URL || 'https://sneppe.beehive.be'

const config: CapacitorConfig = {
  appId: 'be.desneppe.app',
  appName: 'De Sneppe',
  webDir: 'app-shell',
  backgroundColor: '#141414',
  appendUserAgent: 'DeSneppeApp',
  server: {
    url,
    cleartext: false,
    allowNavigation: ['sneppe.beehive.be', 'de-sneppe.be', 'www.de-sneppe.be'],
    errorPath: 'offline.html',
  },
  ios: { contentInset: 'never', scheme: 'De Sneppe' },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 2500, launchAutoHide: true, backgroundColor: '#141414', showSpinner: false, androidScaleType: 'CENTER_CROP', splashFullScreen: false },
    StatusBar: { style: 'DARK', backgroundColor: '#141414', overlaysWebView: false },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
}

export default config
