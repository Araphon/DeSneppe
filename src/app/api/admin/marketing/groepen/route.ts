import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { klantenInGroep, type GroepFilters } from '@/lib/marketing'

export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  await vereisAdmin()
  const g = await prisma.klantgroep.findMany({ orderBy: { naam: 'asc' }, include: { _count: { select: { campagnes: true } } } })
  const res = []
  for (const x of g) res.push({ id: x.id, naam: x.naam, omschrijving: x.omschrijving, filters: x.filters, campagnes: x._count.campagnes, aantal: (await klantenInGroep(x.filters as GroepFilters)).length })
  return ok(res)
})

export const POST = api(async req => {
  await vereisAdmin()
  const d = await body<{ naam?: string; omschrijving?: string; filters?: GroepFilters }>(req)
  if (!d.naam?.trim()) return fout('Geef de groep een naam.')
  return ok(await prisma.klantgroep.create({ data: { naam: d.naam.trim(), omschrijving: d.omschrijving?.trim() || null, filters: (d.filters || {}) as object } }))
})
