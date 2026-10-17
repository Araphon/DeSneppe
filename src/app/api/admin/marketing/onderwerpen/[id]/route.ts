import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'

export const PUT = api(async (req, { params }) => {
  await vereisAdmin()
  const d = await body<{ naam?: string; omschrijving?: string; standaardAan?: boolean; actief?: boolean }>(req)
  const o = await prisma.meldingOnderwerp.findUnique({ where: { id: params.id } })
  if (!o) return fout('Niet gevonden', 404)
  if (!d.naam?.trim()) return fout('Vul een naam in.')
  return ok(await prisma.meldingOnderwerp.update({ where: { id: o.id }, data: { naam: d.naam.trim(), omschrijving: d.omschrijving?.trim() || null, standaardAan: d.standaardAan ?? o.standaardAan, actief: o.systeem ? true : d.actief ?? o.actief } }))
})

export const DELETE = api(async (_req, { params }) => {
  await vereisAdmin()
  const o = await prisma.meldingOnderwerp.findUnique({ where: { id: params.id }, include: { _count: { select: { campagnes: true } } } })
  if (!o) return fout('Niet gevonden', 404)
  if (o.systeem) return fout('Dit onderwerp is nodig voor het systeem en kan niet verwijderd worden.')
  if (o._count.campagnes) return fout('Er zijn nog campagnes met dit onderwerp. Zet het onderwerp op inactief of verwijder eerst die campagnes.')
  await prisma.meldingOnderwerp.delete({ where: { id: o.id } })
  return ok({ ok: true })
})
