import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisKlant } from '@/lib/api'
import { KLANT_COOKIE, huidigeKlant } from '@/lib/auth'
import { klantPubliek, profielSchema, zodFout } from '@/lib/klantvalidatie'
import { datumNaarDb } from '@/lib/tijd'
import { standaardVoorkeuren } from '@/lib/marketing'

export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  const k = await huidigeKlant()
  return ok({ klant: k ? klantPubliek(k) : null })
})

export const PUT = api(async req => {
  const k = await vereisKlant()
  const b = await body<Record<string, unknown>>(req)
  const p = profielSchema.safeParse(b)
  if (!p.success) return fout(zodFout(p.error))
  if (p.data.email !== k.email && (await prisma.klant.findUnique({ where: { email: p.data.email } }))) return fout('Dit e-mailadres is al in gebruik.')
  const nieuw = await prisma.klant.update({
    where: { id: k.id },
    data: {
      ...p.data,
      geboortedatum: datumNaarDb(p.data.geboortedatum),
      mailBestelling: b.mailBestelling !== false,
      pushBestelling: b.pushBestelling !== false,
      mailNieuws: b.mailNieuws === true,
      mailActies: b.mailActies === true,
    },
  })
  if (b.aanvullen && b.mailActies === true) await standaardVoorkeuren(nieuw.id, true).catch(() => {})
  return ok({ klant: klantPubliek(nieuw) })
})

// GDPR: account verwijderen — bestellingen blijven (boekhouding) maar worden geanonimiseerd
export const DELETE = api(async () => {
  const k = await vereisKlant()
  await prisma.$transaction([
    prisma.bestelling.updateMany({ where: { klantId: k.id }, data: { klantId: null, klantNaam: 'Verwijderde klant', klantEmail: null, klantTelefoon: null } }),
    prisma.klant.delete({ where: { id: k.id } }),
  ])
  const res = NextResponse.json({ ok: true })
  res.cookies.set(KLANT_COOKIE, '', { path: '/', maxAge: 0 })
  return res
})
