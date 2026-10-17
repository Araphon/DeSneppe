import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api, body, fout } from '@/lib/api'
import { KLANT_COOKIE, cookieOpties, maakToken, rateLimit } from '@/lib/auth'
import { klantPubliek } from '@/lib/klantvalidatie'

export const POST = api(async req => {
  const { email, wachtwoord } = await body<{ email?: string; wachtwoord?: string }>(req)
  const e = String(email || '').trim().toLowerCase()
  if (!rateLimit('klogin:' + e, 8)) return fout('Te veel pogingen. Probeer over 10 minuten opnieuw.', 429)
  const k = await prisma.klant.findUnique({ where: { email: e } })
  if (!k?.wachtwoord || !(await bcrypt.compare(String(wachtwoord || ''), k.wachtwoord))) return fout('E-mailadres of wachtwoord klopt niet.', 401)
  await prisma.klant.update({ where: { id: k.id }, data: { laatsteLogin: new Date() } })
  const res = NextResponse.json({ klant: klantPubliek(k) })
  res.cookies.set(KLANT_COOKIE, await maakToken(k.id, 'klant', 180), cookieOpties(180))
  return res
})
