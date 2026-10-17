import crypto from 'crypto'
import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from 'jose'
import { SITE } from './site'

// Inloggen met Google, Apple en Microsoft (OpenID Connect, authorization code flow).
// Een provider is pas actief als zijn sleutels in .env staan.

export type Provider = 'google' | 'apple' | 'microsoft'

type Cfg = { naam: string; authUrl: string; tokenUrl: string; jwks: string; issuer: string | ((iss: string) => boolean); scope: string; clientId: string; formPost?: boolean }

function cfg(p: Provider): Cfg | null {
  const e = process.env
  if (p === 'google' && e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET) return {
    naam: 'Google', authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', tokenUrl: 'https://oauth2.googleapis.com/token',
    jwks: 'https://www.googleapis.com/oauth2/v3/certs', issuer: iss => iss === 'https://accounts.google.com' || iss === 'accounts.google.com', scope: 'openid email profile', clientId: e.GOOGLE_CLIENT_ID,
  }
  if (p === 'microsoft' && e.MICROSOFT_CLIENT_ID && e.MICROSOFT_CLIENT_SECRET) return {
    naam: 'Microsoft', authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    jwks: 'https://login.microsoftonline.com/common/discovery/v2.0/keys', issuer: iss => /^https:\/\/login\.microsoftonline\.com\/[0-9a-f-]+\/v2\.0$/.test(iss), scope: 'openid email profile', clientId: e.MICROSOFT_CLIENT_ID,
  }
  if (p === 'apple' && e.APPLE_CLIENT_ID && e.APPLE_TEAM_ID && e.APPLE_KEY_ID && e.APPLE_PRIVATE_KEY) return {
    naam: 'Apple', authUrl: 'https://appleid.apple.com/auth/authorize', tokenUrl: 'https://appleid.apple.com/auth/token',
    jwks: 'https://appleid.apple.com/auth/keys', issuer: 'https://appleid.apple.com', scope: 'name email', clientId: e.APPLE_CLIENT_ID, formPost: true,
  }
  return null
}

export function actieveProviders(): { id: Provider; naam: string }[] {
  return (['google', 'apple', 'microsoft'] as Provider[]).map(id => ({ id, c: cfg(id) })).filter(x => x.c).map(x => ({ id: x.id, naam: x.c!.naam }))
}

export const redirectUri = (p: Provider) => `${SITE}/api/auth/${p}/callback`

export function startUrl(p: Provider, state: string, nonce: string) {
  const c = cfg(p)
  if (!c) return null
  const q = new URLSearchParams({ client_id: c.clientId, redirect_uri: redirectUri(p), response_type: 'code', scope: c.scope, state, nonce })
  if (c.formPost) q.set('response_mode', 'form_post')
  if (p === 'google') q.set('prompt', 'select_account')
  return `${c.authUrl}?${q}`
}

async function clientSecret(p: Provider) {
  const e = process.env
  if (p === 'google') return e.GOOGLE_CLIENT_SECRET!
  if (p === 'microsoft') return e.MICROSOFT_CLIENT_SECRET!
  // Apple: client secret = kort geldige JWT, ondertekend met de .p8-sleutel
  const key = await importPKCS8(e.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n'), 'ES256')
  return new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: e.APPLE_KEY_ID! }).setIssuer(e.APPLE_TEAM_ID!).setSubject(e.APPLE_CLIENT_ID!)
    .setAudience('https://appleid.apple.com').setIssuedAt().setExpirationTime('5m').sign(key)
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

export type SsoProfiel = { sub: string; email: string | null; emailGeverifieerd: boolean; voornaam: string; naam: string }

export async function verwerkCode(p: Provider, code: string, nonce: string, appleUser?: string): Promise<SsoProfiel> {
  const c = cfg(p)
  if (!c) throw new Error('Provider niet ingesteld')
  const r = await fetch(c.tokenUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(p), client_id: c.clientId, client_secret: await clientSecret(p) }),
  })
  const tok = await r.json()
  if (!r.ok || !tok.id_token) throw new Error(`Token mislukt: ${tok.error || r.status}`)
  if (!jwksCache.has(c.jwks)) jwksCache.set(c.jwks, createRemoteJWKSet(new URL(c.jwks)))
  const { payload } = await jwtVerify(tok.id_token, jwksCache.get(c.jwks)!, { audience: c.clientId })
  const iss = String(payload.iss || '')
  if (typeof c.issuer === 'string' ? iss !== c.issuer : !c.issuer(iss)) throw new Error('Ongeldige uitgever')
  if (payload.nonce !== nonce) throw new Error('Ongeldige nonce')
  const email = (payload.email as string) || (payload.preferred_username as string) || null
  let voornaam = (payload.given_name as string) || '', naam = (payload.family_name as string) || ''
  if (!voornaam && payload.name) { const delen = String(payload.name).split(' '); voornaam = delen.shift() || ''; naam = naam || delen.join(' ') }
  if (p === 'apple' && appleUser) { try { const u = JSON.parse(appleUser); voornaam = u.name?.firstName || voornaam; naam = u.name?.lastName || naam } catch {} }
  const geverifieerd = p === 'microsoft' ? Boolean(email) : payload.email_verified === true || payload.email_verified === 'true'
  return { sub: String(payload.sub), email: email?.toLowerCase() || null, emailGeverifieerd: geverifieerd, voornaam, naam }
}

export const nieuwGeheim = () => crypto.randomBytes(18).toString('base64url')
