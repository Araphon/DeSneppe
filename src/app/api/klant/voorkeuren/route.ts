import { prisma } from '@/lib/db'
import { api, body, ok, vereisKlant } from '@/lib/api'
import { zorgVoorStandaard } from '@/lib/marketing'

export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  const k = await vereisKlant()
  await zorgVoorStandaard()
  const ond = await prisma.meldingOnderwerp.findMany({ where: { actief: true }, orderBy: { volgorde: 'asc' }, include: { voorkeuren: { where: { klantId: k.id } } } })
  return ok(ond.map(o => ({ id: o.id, naam: o.naam, omschrijving: o.omschrijving, systeem: o.systeem, mail: o.voorkeuren[0]?.mail ?? o.systeem, push: o.voorkeuren[0]?.push ?? o.systeem })))
})

// { onderwerpId, mail?, push? }
export const PUT = api(async req => {
  const k = await vereisKlant()
  const d = await body<{ onderwerpId?: string; mail?: boolean; push?: boolean }>(req)
  const o = await prisma.meldingOnderwerp.findUnique({ where: { id: String(d.onderwerpId || '') }, include: { voorkeuren: { where: { klantId: k.id } } } })
  if (!o) return ok({ ok: false })
  const huidig = o.voorkeuren[0] ?? { mail: o.systeem, push: o.systeem }
  const data = { mail: d.mail ?? huidig.mail, push: d.push ?? huidig.push }
  await prisma.klantVoorkeur.upsert({ where: { klantId_onderwerpId: { klantId: k.id, onderwerpId: o.id } }, create: { klantId: k.id, onderwerpId: o.id, ...data }, update: data })
  return ok({ ok: true })
})
