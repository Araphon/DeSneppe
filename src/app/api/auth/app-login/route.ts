import { NextResponse } from 'next/server'
import { KLANT_COOKIE, cookieOpties, leesAppLoginCode, maakToken } from '@/lib/auth'
import { SITE } from '@/lib/site'

export const dynamic = 'force-dynamic'

// De app wisselt de eenmalige code uit de in-app browser in voor een sessie in de app zelf
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const terug = q.get('terug') || '/account'
  const id = await leesAppLoginCode(q.get('code') || '')
  if (!id) return NextResponse.redirect(`${SITE}/account?sso=verlopen`, 303)
  const res = NextResponse.redirect(`${SITE}${terug.startsWith('/') && !terug.startsWith('//') ? terug : '/account'}`, 303)
  res.cookies.set(KLANT_COOKIE, await maakToken(id, 'klant', 180), cookieOpties(180))
  return res
}
