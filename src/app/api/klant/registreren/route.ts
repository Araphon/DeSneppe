import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api, body, fout } from '@/lib/api'
import { KLANT_COOKIE, cookieOpties, maakToken, rateLimit } from '@/lib/auth'
import { klantPubliek, profielSchema, zodFout } from '@/lib/klantvalidatie'
import { datumNaarDb } from '@/lib/tijd'
import { checkTurnstile, clientIp, isWegwerpMail } from '@/lib/misbruik'
import { standaardVoorkeuren } from '@/lib/marketing'

export const POST = api(async req => {
  const ip = clientIp(req)
  if (!rateLimit('reg:' + ip, 10, 60 * 60000)) return fout('Te veel pogingen. Probeer later opnieuw.', 429)
  const b = await body<Record<string, unknown>>(req)
  // Bots: verborgen veld ingevuld of formulier binnen 3 seconden verstuurd
  if (b.website || Number(b.formTijd || 0) < 3000) return fout('Er liep iets mis. Probeer opnieuw.', 400)
  if (!(await checkTurnstile(b.turnstile as string | undefined, ip))) return fout('Bevestig even dat je geen robot bent.', 400)
  const p = profielSchema.safeParse(b)
  if (!p.success) return fout(zodFout(p.error))
  const ww = String(b.wachtwoord || '')
  if (ww.length < 8) return fout('Kies een wachtwoord van minstens 8 tekens.')
  if (isWegwerpMail(p.data.email)) return fout('Gebruik een gewoon e-mailadres (geen tijdelijk adres).')
  if (await prisma.klant.findUnique({ where: { email: p.data.email } })) return fout('Er bestaat al een account met dit e-mailadres. Meld je aan.')
  const k = await prisma.klant.create({
    data: { ...p.data, geboortedatum: datumNaarDb(p.data.geboortedatum), wachtwoord: await bcrypt.hash(ww, 10), laatsteLogin: new Date(), registratieIp: ip },
  })
  await standaardVoorkeuren(k.id, p.data.mailActies === true || p.data.mailNieuws === true).catch(e => console.error('[voorkeuren]', e))
  const res = NextResponse.json({ klant: klantPubliek(k) })
  res.cookies.set(KLANT_COOKIE, await maakToken(k.id, 'klant', 180), cookieOpties(180))
  return res
})
