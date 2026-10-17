import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'

export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  await vereisAdmin()
  const l = await prisma.label.findMany({ include: { _count: { select: { producten: true } } }, orderBy: [{ volgorde: 'asc' }, { naam: 'asc' }] })
  return ok(l.map(x => ({ id: x.id, naam: x.naam, afbeelding: x.afbeelding, kleur: x.kleur, volgorde: x.volgorde, aantal: x._count.producten })))
})

export const POST = api(async req => {
  await vereisAdmin()
  const { naam, afbeelding, kleur } = await body<{ naam?: string; afbeelding?: string; kleur?: string }>(req)
  if (!naam?.trim()) return fout('Naam is verplicht.')
  if (await prisma.label.findUnique({ where: { naam: naam.trim() } })) return fout('Dit label bestaat al.')
  const max = await prisma.label.aggregate({ _max: { volgorde: true } })
  return ok(await prisma.label.create({ data: { naam: naam.trim(), afbeelding: afbeelding || null, kleur: kleur || '#16a34a', volgorde: (max._max.volgorde ?? -1) + 1 } }))
})
