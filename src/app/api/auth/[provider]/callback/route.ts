import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { KLANT_COOKIE, cookieOpties, maakAppLoginCode, maakToken } from '@/lib/auth'
import { terugNaarApp } from '@/lib/app'
import { standaardVoorkeuren } from '@/lib/marketing'
import { SITE } from '@/lib/site'
import { verwerkCode, type Provider } from '@/lib/sso'

export const dynamic = 'force-dynamic'

const VELD: Record<Provider, 'googleId' | 'appleId' | 'microsoftId'> = { google: 'googleId', apple: 'appleId', microsoft: 'microsoftId' }

async function afhandelen(req: Request, p: Provider, code: string | null, state: string | null, appleUser?: string) {
  let opgeslagen: { p: string; state: string; nonce: string; terug: string; app?: boolean } | null = null
  try { opgeslagen = JSON.parse(cookies().get('sn_sso')?.value || '') } catch {}
  // In de app: altijd terug naar de app springen (ook bij een fout)
  const fout = (r: string) => opgeslagen?.app ? terugNaarApp(`login?fout=${r}`, 'Aanmelden niet gelukt') : NextResponse.redirect(`${SITE}/account?sso=${r}`, 303)
  if (!opgeslagen) return fout('verlopen')
  if (!code || !state || opgeslagen.state !== state || opgeslagen.p !== p) return fout('verlopen')
  let prof
  try { prof = await verwerkCode(p, code, opgeslagen.nonce, appleUser) } catch (e) { console.error('[sso]', p, e); return fout('mislukt') }

  const veld = VELD[p]
  let klant = await prisma.klant.findFirst({ where: { [veld]: prof.sub } })
  if (!klant && prof.email && prof.emailGeverifieerd) {
    klant = await prisma.klant.findUnique({ where: { email: prof.email } })
    if (klant) klant = await prisma.klant.update({ where: { id: klant.id }, data: { [veld]: prof.sub } })
  }
  if (!klant) {
    if (!prof.email) return fout('geen-email')
    if (await prisma.klant.findUnique({ where: { email: prof.email } })) return fout('email-bestaat')
    klant = await prisma.klant.create({ data: { email: prof.email, [veld]: prof.sub, voornaam: prof.voornaam || '', naam: prof.naam || '', adres: '', postcode: '', gemeente: '', telefoon: '', laatsteLogin: new Date() } })
    await standaardVoorkeuren(klant.id, false).catch(() => {})
  } else {
    await prisma.klant.update({ where: { id: klant.id }, data: { laatsteLogin: new Date() } })
  }
  if (klant.geblokkeerd) return fout('geblokkeerd')
  const onvolledig = !klant.voornaam || !klant.naam || !klant.adres || !klant.postcode || !klant.gemeente || !klant.telefoon || !klant.geboortedatum
  const doel = onvolledig ? `/account/aanvullen?terug=${encodeURIComponent(opgeslagen.terug)}` : opgeslagen.terug
  if (opgeslagen.app) {
    const res = terugNaarApp(`login?code=${await maakAppLoginCode(klant.id)}&terug=${encodeURIComponent(doel)}`, 'Aangemeld')
    const r2 = new NextResponse(res.body, res)
    r2.cookies.set('sn_sso', '', { path: '/api/auth', maxAge: 0 })
    return r2
  }
  const res = NextResponse.redirect(`${SITE}${doel}`, 303)
  res.cookies.set(KLANT_COOKIE, await maakToken(klant.id, 'klant', 180), cookieOpties(180))
  res.cookies.set('sn_sso', '', { path: '/api/auth', maxAge: 0 })
  return res
}

function geannuleerd() {
  let app = false
  try { app = Boolean(JSON.parse(cookies().get('sn_sso')?.value || '').app) } catch {}
  return app ? terugNaarApp('login?fout=geannuleerd', 'Aanmelden geannuleerd') : NextResponse.redirect(`${SITE}/account?sso=geannuleerd`, 303)
}

export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const u = new URL(req.url)
  if (u.searchParams.get('error')) return geannuleerd()
  return afhandelen(req, params.provider as Provider, u.searchParams.get('code'), u.searchParams.get('state'))
}

// Apple (response_mode=form_post)
export async function POST(req: Request, { params }: { params: { provider: string } }) {
  const f = await req.formData()
  if (f.get('error')) return geannuleerd()
  return afhandelen(req, params.provider as Provider, String(f.get('code') || ''), String(f.get('state') || ''), f.get('user') ? String(f.get('user')) : undefined)
}
