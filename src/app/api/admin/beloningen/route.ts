import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'

export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  await vereisAdmin()
  const [beloningen, vouchers, klanten] = await Promise.all([
    prisma.loyaltyBeloning.findMany({ orderBy: [{ punten: 'asc' }], include: { _count: { select: { vouchers: { where: { status: 'INGEWISSELD' } } } } } }),
    prisma.voucher.findMany({ include: { beloning: true, klant: { select: { voornaam: true, naam: true } } }, orderBy: { aangemaaktOp: 'desc' }, take: 50 }),
    prisma.klant.aggregate({ _sum: { punten: true }, _count: true }),
  ])
  return ok({ beloningen, vouchers, totaalPunten: klanten._sum.punten || 0, aantalKlanten: klanten._count })
})

export const POST = api(async req => {
  await vereisAdmin()
  const d = await body<{ naam?: string; omschrijving?: string; punten?: number; afbeelding?: string; actief?: boolean }>(req)
  if (!d.naam?.trim() || !(Number(d.punten) > 0)) return fout('Vul een naam en een aantal punten in.')
  return ok(await prisma.loyaltyBeloning.create({ data: { naam: d.naam.trim(), omschrijving: d.omschrijving?.trim() || null, punten: Math.round(Number(d.punten)), afbeelding: d.afbeelding || null, actief: d.actief !== false } }))
})
