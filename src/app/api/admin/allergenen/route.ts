import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'

export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  await vereisAdmin()
  const l = await prisma.allergeen.findMany({ orderBy: [{ wettelijk: 'desc' }, { volgorde: 'asc' }, { naam: 'asc' }], include: { _count: { select: { producten: true } } } })
  return ok(l.map(a => ({ id: a.id, naam: a.naam, icoon: a.icoon, wettelijk: a.wettelijk, aantal: a._count.producten })))
})

export const POST = api(async req => {
  await vereisAdmin()
  const { naam, icoon } = await body<{ naam?: string; icoon?: string }>(req)
  const n = naam?.trim()
  if (!n) return fout('Vul een naam in.')
  if (await prisma.allergeen.findFirst({ where: { naam: { equals: n, mode: 'insensitive' } } })) return fout('Dit allergeen bestaat al.')
  const max = await prisma.allergeen.aggregate({ _max: { volgorde: true } })
  return ok(await prisma.allergeen.create({ data: { naam: n, icoon: icoon?.trim().slice(0, 8) || null, volgorde: (max._max.volgorde ?? 0) + 1 } }))
})
