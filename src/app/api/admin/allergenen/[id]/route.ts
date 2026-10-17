import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'

export const PUT = api(async (req, { params }) => {
  await vereisAdmin()
  const { naam, icoon } = await body<{ naam?: string; icoon?: string }>(req)
  const a = await prisma.allergeen.findUnique({ where: { id: params.id } })
  if (!a) return fout('Niet gevonden', 404)
  const n = naam?.trim()
  if (!n) return fout('Vul een naam in.')
  return ok(await prisma.allergeen.update({ where: { id: a.id }, data: { naam: a.wettelijk ? a.naam : n, icoon: icoon?.trim().slice(0, 8) || null } }))
})

export const DELETE = api(async (_req, { params }) => {
  await vereisAdmin()
  const a = await prisma.allergeen.findUnique({ where: { id: params.id } })
  if (!a) return fout('Niet gevonden', 404)
  if (a.wettelijk) return fout('De 14 wettelijke allergenen kunnen niet verwijderd worden.')
  await prisma.allergeen.delete({ where: { id: a.id } })
  return ok({ ok: true })
})
