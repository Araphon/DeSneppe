import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import type { GroepFilters } from '@/lib/marketing'

export const PUT = api(async (req, { params }) => {
  await vereisAdmin()
  const d = await body<{ naam?: string; omschrijving?: string; filters?: GroepFilters }>(req)
  if (!d.naam?.trim()) return fout('Geef de groep een naam.')
  return ok(await prisma.klantgroep.update({ where: { id: params.id }, data: { naam: d.naam.trim(), omschrijving: d.omschrijving?.trim() || null, filters: (d.filters || {}) as object } }))
})

export const DELETE = api(async (_req, { params }) => {
  await vereisAdmin()
  await prisma.klantgroep.delete({ where: { id: params.id } })
  return ok({ ok: true })
})
