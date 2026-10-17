import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { zorgVoorStandaard } from '@/lib/marketing'
import { slugify } from '@/lib/slug'

export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  await vereisAdmin()
  await zorgVoorStandaard()
  const [ond, klanten] = await Promise.all([
    prisma.meldingOnderwerp.findMany({ orderBy: { volgorde: 'asc' }, include: { voorkeuren: { select: { mail: true, push: true } }, _count: { select: { campagnes: true } } } }),
    prisma.klant.count(),
  ])
  return ok(ond.map(o => ({
    id: o.id, sleutel: o.sleutel, naam: o.naam, omschrijving: o.omschrijving, systeem: o.systeem, standaardAan: o.standaardAan, actief: o.actief, campagnes: o._count.campagnes,
    mailAan: o.systeem ? klanten - o.voorkeuren.filter(v => !v.mail).length : o.voorkeuren.filter(v => v.mail).length,
    pushAan: o.systeem ? klanten - o.voorkeuren.filter(v => !v.push).length : o.voorkeuren.filter(v => v.push).length,
  })))
})

export const POST = api(async req => {
  await vereisAdmin()
  const d = await body<{ naam?: string; omschrijving?: string; standaardAan?: boolean }>(req)
  if (!d.naam?.trim()) return fout('Vul een naam in.')
  let sleutel = slugify(d.naam)
  for (let n = 2; await prisma.meldingOnderwerp.findUnique({ where: { sleutel } }); n++) sleutel = `${slugify(d.naam)}-${n}`
  const max = await prisma.meldingOnderwerp.aggregate({ _max: { volgorde: true } })
  return ok(await prisma.meldingOnderwerp.create({ data: { sleutel, naam: d.naam.trim(), omschrijving: d.omschrijving?.trim() || null, standaardAan: d.standaardAan !== false, volgorde: (max._max.volgorde ?? 0) + 1 } }))
})
