import { NextResponse } from 'next/server'
import { nieuwGeheim, startUrl, type Provider } from '@/lib/sso'
import { SITE } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const p = params.provider as Provider
  const q = new URL(req.url).searchParams
  const terug = q.get('terug') || '/account'
  const app = q.get('app') === '1'
  const state = nieuwGeheim(), nonce = nieuwGeheim()
  const url = startUrl(p, state, nonce)
  if (!url) return NextResponse.redirect(`${SITE}/account?sso=niet-beschikbaar`)
  const res = NextResponse.redirect(url)
  // Apple stuurt terug met een POST vanaf een ander domein → SameSite=None nodig
  res.cookies.set('sn_sso', JSON.stringify({ p, state, nonce, terug: terug.startsWith('/') && !terug.startsWith('//') ? terug : '/account', app }), { httpOnly: true, secure: true, sameSite: 'none', path: '/api/auth', maxAge: 600 })
  return res
}
