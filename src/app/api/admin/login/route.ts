import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api, body, fout } from '@/lib/api'
import { ADMIN_COOKIE, cookieOpties, maakToken, rateLimit } from '@/lib/auth'

export const POST = api(async req => {
  const { email, wachtwoord } = await body<{ email?: string; wachtwoord?: string }>(req)
  const e = String(email || '').trim().toLowerCase()
  if (!rateLimit('alogin:' + e, 6)) return fout('Te veel pogingen. Probeer over 10 minuten opnieuw.', 429)
  const a = await prisma.adminGebruiker.findUnique({ where: { email: e } })
  if (!a || !a.actief || !a.wachtwoord || !(await bcrypt.compare(String(wachtwoord || ''), a.wachtwoord))) return fout('E-mailadres of wachtwoord klopt niet.', 401)
  await prisma.adminGebruiker.update({ where: { id: a.id }, data: { laatsteLogin: new Date() } })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, await maakToken(a.id, 'admin', 90), cookieOpties(90))
  return res
})
