'use client'
// Hulpfuncties voor de native app (Capacitor). Op de gewone website doen ze niets.

type Cap = { isNativePlatform?: () => boolean; getPlatform?: () => string }
const cap = (): Cap | undefined => (typeof window !== 'undefined' ? (window as unknown as { Capacitor?: Cap }).Capacitor : undefined)

export const isNative = () => Boolean(cap()?.isNativePlatform?.())
export const platform = () => (cap()?.getPlatform?.() || 'web') as 'ios' | 'android' | 'web'

/** Opent een pagina in de in-app browser (inloggen met Google/Apple, online betalen). */
export async function openInApp(url: string) {
  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url, toolbarColor: '#141414', presentationStyle: 'popover' })
}

const TOKEN_KEY = 'sn_push_token'
const bewaar = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch {} }
const lees = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }

let luistert = false
async function luister() {
  if (luistert) return
  luistert = true
  const { PushNotifications } = await import('@capacitor/push-notifications')
  await PushNotifications.addListener('registration', async t => {
    bewaar(TOKEN_KEY, t.value)
    await fetch('/api/klant/push-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t.value, platform: platform() }) }).catch(() => {})
  })
  await PushNotifications.addListener('registrationError', e => console.warn('[push] registratie mislukt', e.error))
  await PushNotifications.addListener('pushNotificationActionPerformed', a => {
    const url = (a.notification.data as { url?: string } | undefined)?.url
    if (url) { try { const u = new URL(url, location.origin); location.href = u.pathname + u.search + u.hash } catch {} }
  })
  if (platform() === 'android') {
    await PushNotifications.createChannel({ id: 'bestellingen', name: 'Bestellingen', description: 'Je bestelling is klaar en andere meldingen', importance: 5, visibility: 1, vibration: true }).catch(() => {})
  }
}

export type MeldingStatus = 'aan' | 'uit' | 'vragen' | 'niet-native'
export async function meldingStatus(): Promise<MeldingStatus> {
  if (!isNative()) return 'niet-native'
  const { PushNotifications } = await import('@capacitor/push-notifications')
  const p = await PushNotifications.checkPermissions()
  return p.receive === 'granted' ? 'aan' : p.receive === 'denied' ? 'uit' : 'vragen'
}

/** Registreert dit toestel als meldingen al toegestaan zijn (bij elke start / na aanmelden). */
export async function registreerAlsToegestaan() {
  if ((await meldingStatus()) !== 'aan') return
  await luister()
  const { PushNotifications } = await import('@capacitor/push-notifications')
  await PushNotifications.register()
}

/** Vraagt toestemming (systeemvenster) en registreert dit toestel. */
export async function vraagMeldingen(): Promise<MeldingStatus> {
  if (!isNative()) return 'niet-native'
  const { PushNotifications } = await import('@capacitor/push-notifications')
  const p = await PushNotifications.requestPermissions()
  if (p.receive !== 'granted') return 'uit'
  await luister()
  await PushNotifications.register()
  return 'aan'
}

/** Bij afmelden: dit toestel loskoppelen van het account. */
export async function afmeldenToestel() {
  const t = lees(TOKEN_KEY)
  if (!t || !isNative()) return
  await fetch('/api/klant/push-token', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t }) }).catch(() => {})
}

/** Online betalen in de app: Mollie in de in-app browser, daarna terug naar de bestelling. */
export async function betaalInApp(bestellingId: string, betaalUrl: string) {
  try { sessionStorage.setItem('sn_betaling', bestellingId) } catch {}
  await openInApp(betaalUrl)
}
