import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api, body, fout, ok } from '@/lib/api'
import { ADMIN_COOKIE, cookieOpties, maakToken } from '@/lib/auth'

async function geldig(token: string | null) {
  if (!token) return null
  const a = await prisma.adminGebruiker.findUnique({ where: { uitnodigToken: token } })
  return a && a.actief && a.uitnodigTot && a.uitnodigTot > new Date() ? a : null
}

export const dynamic = 'force-dynamic'
export const GET = api(async req => {
  const a = await geldig(new URL(req.url).searchParams.get('token'))
  return a ? ok({ naam: a.naam, email: a.email }) : fout('Deze uitnodiging is ongeldig of verlopen. Vraag een nieuwe aan.', 404)
})

export const POST = api(async req => {
  const { token, wachtwoord } = await body<{ token?: string; wachtwoord?: string }>(req)
  const a = await geldig(token || null)
  if (!a) return fout('Deze uitnodiging is ongeldig of verlopen. Vraag een nieuwe aan.')
  if (String(wachtwoord || '').length < 10) return fout('Kies een wachtwoord van minstens 10 tekens.')
  await prisma.adminGebruiker.update({ where: { id: a.id }, data: { wachtwoord: await bcrypt.hash(String(wachtwoord), 10), uitnodigToken: null, uitnodigTot: null, laatsteLogin: new Date() } })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, await maakToken(a.id, 'admin', 90), cookieOpties(90))
  return res
})
