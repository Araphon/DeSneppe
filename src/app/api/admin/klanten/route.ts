import { prisma } from '@/lib/db'
import { api, ok, vereisAdmin } from '@/lib/api'

export const dynamic = 'force-dynamic'
export const GET = api(async req => {
  await vereisAdmin()
  const q = new URL(req.url).searchParams.get('q')?.trim()
  const where = q ? { OR: [{ voornaam: { contains: q, mode: 'insensitive' as const } }, { naam: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }, { telefoon: { contains: q } }] } : {}
  const [lijst, totaal] = await Promise.all([
    prisma.klant.findMany({ where, orderBy: { aangemaaktOp: 'desc' }, take: 100, include: { _count: { select: { bestellingen: true } } } }),
    prisma.klant.count(),
  ])
  return ok({
    totaal,
    klanten: lijst.map(k => ({ id: k.id, naam: `${k.voornaam} ${k.naam}`, email: k.email, telefoon: k.telefoon, gemeente: k.gemeente, punten: k.punten, noShows: k.noShows, alleenOnline: k.alleenOnline, geblokkeerd: k.geblokkeerd, bestellingen: k._count.bestellingen, aangemaaktOp: k.aangemaaktOp, mailActies: k.mailActies, mailNieuws: k.mailNieuws })),
  })
})
