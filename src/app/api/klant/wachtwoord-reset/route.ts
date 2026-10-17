import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api, body, fout } from '@/lib/api'
import { KLANT_COOKIE, cookieOpties, maakToken } from '@/lib/auth'

export const POST = api(async req => {
  const { token, wachtwoord } = await body<{ token?: string; wachtwoord?: string }>(req)
  if (String(wachtwoord || '').length < 8) return fout('Kies een wachtwoord van minstens 8 tekens.')
  const k = token ? await prisma.klant.findUnique({ where: { resetToken: String(token) } }) : null
  if (!k || !k.resetTokenTot || k.resetTokenTot < new Date()) return fout('Deze link is verlopen. Vraag een nieuwe aan.')
  await prisma.klant.update({ where: { id: k.id }, data: { wachtwoord: await bcrypt.hash(String(wachtwoord), 10), resetToken: null, resetTokenTot: null } })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(KLANT_COOKIE, await maakToken(k.id, 'klant', 180), cookieOpties(180))
  return res
})
