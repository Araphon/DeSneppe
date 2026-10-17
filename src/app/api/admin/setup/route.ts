import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api, body, fout, ok } from '@/lib/api'
import { ADMIN_COOKIE, cookieOpties, maakToken } from '@/lib/auth'

// Eerste beheerder aanmaken (enkel zolang er nog geen is). Extra beheerders worden uitgenodigd.
export const GET = api(async () => ok({ nodig: (await prisma.adminGebruiker.count()) === 0 }))

export const POST = api(async req => {
  if ((await prisma.adminGebruiker.count()) > 0) return fout('Er is al een beheerder. Nodig extra beheerders uit via Beheerders.', 403)
  const { naam, email, wachtwoord } = await body<{ naam?: string; email?: string; wachtwoord?: string }>(req)
  const e = String(email || '').trim().toLowerCase()
  if (!naam || !/^\S+@\S+\.\S+$/.test(e)) return fout('Vul naam en e-mailadres in.')
  if (String(wachtwoord || '').length < 10) return fout('Kies een wachtwoord van minstens 10 tekens.')
  if (await prisma.adminGebruiker.findUnique({ where: { email: e } })) return fout('Dit e-mailadres bestaat al.')
  const a = await prisma.adminGebruiker.create({ data: { naam: String(naam).trim(), email: e, wachtwoord: await bcrypt.hash(String(wachtwoord), 10) } })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, await maakToken(a.id, 'admin', 90), cookieOpties(90))
  return res
})
