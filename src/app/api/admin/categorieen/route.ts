import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { uniekeCatSlug } from '@/lib/categorie'

export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  await vereisAdmin()
  const c = await prisma.categorie.findMany({ include: { _count: { select: { producten: true } } }, orderBy: [{ volgorde: 'asc' }, { naam: 'asc' }] })
  return ok(c.map(x => ({ id: x.id, naam: x.naam, slug: x.slug, omschrijving: x.omschrijving, volgorde: x.volgorde, zichtbaar: x.zichtbaar, aantal: x._count.producten })))
})

export const POST = api(async req => {
  await vereisAdmin()
  const { naam, omschrijving } = await body<{ naam?: string; omschrijving?: string }>(req)
  if (!naam?.trim()) return fout('Naam is verplicht.')
  const max = await prisma.categorie.aggregate({ _max: { volgorde: true } })
  const c = await prisma.categorie.create({ data: { naam: naam.trim(), omschrijving: omschrijving?.trim() || null, slug: await uniekeCatSlug(naam), volgorde: (max._max.volgorde ?? -1) + 1 } })
  return ok(c)
})

// Volgorde opslaan: { ids: [...] }
export const PUT = api(async req => {
  await vereisAdmin()
  const { ids } = await body<{ ids?: string[] }>(req)
  if (!Array.isArray(ids)) return fout('Ongeldig')
  await prisma.$transaction(ids.map((id, i) => prisma.categorie.update({ where: { id }, data: { volgorde: i } })))
  return ok({ ok: true })
})
