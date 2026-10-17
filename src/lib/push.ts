import fs from 'fs'
import http2 from 'http2'
import { SignJWT, importPKCS8 } from 'jose'
import { prisma } from './db'

// Pushberichten naar de app.
// Android: Firebase Cloud Messaging (HTTP v1, service-account uit FIREBASE_SERVICE_ACCOUNT_PATH).
// iOS: rechtstreeks via Apple Push (APNs, .p8-sleutel) — geen Firebase nodig in de iOS-app.

export type PushBericht = { titel: string; tekst: string; url?: string }
type Abonnement = { id: string; endpoint: string; data: unknown }

const sleutel = (v?: string) => v?.replace(/\\n/g, '\n')

// ─── Android (FCM) ──────────────────────────────────────────────────────────

type ServiceAccount = { project_id: string; client_email: string; private_key: string }
let sa: ServiceAccount | null | undefined
function serviceAccount(): ServiceAccount | null {
  if (sa !== undefined) return sa
  const pad = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  try { sa = pad ? JSON.parse(fs.readFileSync(pad, 'utf8')) : null } catch (e) { console.error('[push] service-account onleesbaar', e); sa = null }
  return sa ?? null
}

let fcmToken: { waarde: string; tot: number } | null = null
async function fcmAccessToken(s: ServiceAccount) {
  if (fcmToken && fcmToken.tot > Date.now() + 60000) return fcmToken.waarde
  const key = await importPKCS8(s.private_key, 'RS256')
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).setIssuer(s.client_email).setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt().setExpirationTime('1h').sign(key)
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`FCM-token: ${j.error || r.status}`)
  fcmToken = { waarde: j.access_token, tot: Date.now() + j.expires_in * 1000 }
  return fcmToken.waarde
}

async function stuurFcm(token: string, b: PushBericht): Promise<'ok' | 'ongeldig' | 'fout'> {
  const s = serviceAccount()
  if (!s) return 'fout'
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${s.project_id}/messages:send`, {
    method: 'POST', headers: { Authorization: `Bearer ${await fcmAccessToken(s)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: {
      token, notification: { title: b.titel, body: b.tekst }, data: b.url ? { url: b.url } : {},
      android: { priority: 'high', notification: { channel_id: 'bestellingen', icon: 'ic_stat_sneppe', color: '#F2B124', sound: 'default' } },
    } }),
  })
  if (r.ok) return 'ok'
  const j = await r.json().catch(() => ({}))
  const code = j?.error?.details?.find((d: { errorCode?: string }) => d.errorCode)?.errorCode || j?.error?.status
  if (r.status === 404 || code === 'UNREGISTERED') return 'ongeldig'
  console.error('[push] fcm', r.status, code)
  return 'fout'
}

// ─── iOS (APNs) ─────────────────────────────────────────────────────────────

let apnsJwt: { waarde: string; tot: number } | null = null
async function apnsToken() {
  if (apnsJwt && apnsJwt.tot > Date.now()) return apnsJwt.waarde
  const key = await importPKCS8(sleutel(process.env.APNS_PRIVATE_KEY)!, 'ES256')
  const waarde = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: process.env.APNS_KEY_ID! })
    .setIssuer(process.env.APNS_TEAM_ID || process.env.APPLE_TEAM_ID!).setIssuedAt().sign(key)
  apnsJwt = { waarde, tot: Date.now() + 40 * 60000 } // Apple: tussen 20 en 60 minuten hergebruiken
  return waarde
}

function apnsRequest(host: string, token: string, payload: string, jwt: string): Promise<{ status: number; reden?: string }> {
  return new Promise(resolve => {
    const client = http2.connect(`https://${host}`)
    client.on('error', () => resolve({ status: 0 }))
    const req = client.request({
      ':method': 'POST', ':path': `/3/device/${token}`, authorization: `bearer ${jwt}`,
      'apns-topic': process.env.APNS_BUNDLE_ID || 'be.desneppe.app', 'apns-push-type': 'alert', 'apns-priority': '10',
    })
    let status = 0, data = ''
    req.on('response', h => { status = Number(h[':status']) })
    req.on('data', c => { data += c })
    req.on('end', () => { client.close(); let reden: string | undefined; try { reden = JSON.parse(data).reason } catch {} resolve({ status, reden }) })
    req.on('error', () => { client.close(); resolve({ status: 0 }) })
    req.end(payload)
  })
}

async function stuurApns(token: string, b: PushBericht): Promise<'ok' | 'ongeldig' | 'fout'> {
  const payload = JSON.stringify({ aps: { alert: { title: b.titel, body: b.tekst }, sound: 'default' }, url: b.url })
  const jwt = await apnsToken()
  let r = await apnsRequest('api.push.apple.com', token, payload, jwt)
  // Testbuilds uit Xcode gebruiken de sandbox
  if (r.reden === 'BadDeviceToken') r = await apnsRequest('api.sandbox.push.apple.com', token, payload, jwt)
  if (r.status === 200) return 'ok'
  if (r.status === 410 || r.reden === 'BadDeviceToken' || r.reden === 'Unregistered' || r.reden === 'DeviceTokenNotForTopic') return 'ongeldig'
  console.error('[push] apns', r.status, r.reden)
  return 'fout'
}

// ─── Publiek ────────────────────────────────────────────────────────────────

export function pushStatus() {
  return {
    android: Boolean(serviceAccount()),
    ios: Boolean(process.env.APNS_KEY_ID && process.env.APNS_PRIVATE_KEY && (process.env.APNS_TEAM_ID || process.env.APPLE_TEAM_ID)),
  }
}

async function stuurNaar(a: Abonnement, b: PushBericht) {
  const platform = (a.data as { platform?: string } | null)?.platform
  const st = pushStatus()
  try {
    const r = platform === 'ios' ? (st.ios ? await stuurApns(a.endpoint, b) : 'fout') : (st.android ? await stuurFcm(a.endpoint, b) : 'fout')
    if (r === 'ongeldig') await prisma.pushAbonnement.delete({ where: { id: a.id } }).catch(() => {})
    return r === 'ok'
  } catch (e) {
    console.error('[push]', platform, e)
    return false
  }
}

/** Stuurt een bericht naar alle toestellen van een klant. Geeft het aantal geslaagde toestellen terug. */
export async function stuurPushAanKlant(klantId: string, b: PushBericht): Promise<number> {
  const abos = await prisma.pushAbonnement.findMany({ where: { klantId } })
  if (!abos.length) return 0
  const res = await Promise.all(abos.map(a => stuurNaar(a, b)))
  return res.filter(Boolean).length
}
