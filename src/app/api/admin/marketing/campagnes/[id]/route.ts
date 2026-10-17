import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { ontvangersVan } from '@/lib/marketing'

export const dynamic = 'force-dynamic'

export const GET = api(async (_req, { params }) => {
  await vereisAdmin()
  const c = await prisma.campagne.findUnique({ where: { id: params.id } })
  if (!c) return fout('Niet gevonden', 404)
  const log = await prisma.verzending.findMany({ where: { campagneId: c.id }, orderBy: { verzondenOp: 'desc' }, take: 100, include: { klant: { select: { voornaam: true, naam: true } } } })
  return ok({ ...c, ontvangers: (await ontvangersVan(c)).length, log: log.map(l => ({ id: l.id, klant: l.klant ? `${l.klant.voornaam} ${l.klant.naam}` : 'verwijderde klant', kanaal: l.kanaal, status: l.status, reden: l.reden, verzondenOp: l.verzondenOp })) })
})

export const PUT = api(async (req, { params }) => {
  await vereisAdmin()
  const c = await prisma.campagne.findUnique({ where: { id: params.id } })
  if (!c) return fout('Niet gevonden', 404)
  const d = await body<Record<string, unknown>>(req)
  const str = (k: string, max = 5000) => (typeof d[k] === 'string' ? (d[k] as string).slice(0, max) : undefined)
  if (str('onderwerpRegel') === '' || str('titel') === '') return fout('Onderwerpregel en titel zijn verplicht.')
  const trig = d.trigger as { soort?: string; dagen?: number; uren?: number } | undefined
  await prisma.campagne.update({ where: { id: c.id }, data: {
    naam: str('naam', 120) || c.naam,
    onderwerpId: str('onderwerpId') || c.onderwerpId,
    klantgroepId: d.klantgroepId === null || d.klantgroepId === '' ? null : str('klantgroepId') ?? c.klantgroepId,
    viaMail: typeof d.viaMail === 'boolean' ? d.viaMail : c.viaMail,
    viaPush: typeof d.viaPush === 'boolean' ? d.viaPush : c.viaPush,
    onderwerpRegel: str('onderwerpRegel', 200) ?? c.onderwerpRegel,
    titel: str('titel', 200) ?? c.titel,
    tekst: str('tekst') ?? c.tekst,
    knopTekst: d.knopTekst === '' ? null : str('knopTekst', 60) ?? c.knopTekst,
    knopUrl: d.knopUrl === '' ? null : str('knopUrl', 500) ?? c.knopUrl,
    afbeelding: d.afbeelding === null || d.afbeelding === '' ? null : str('afbeelding') ?? c.afbeelding,
    pushTekst: d.pushTekst === '' ? null : str('pushTekst', 180) ?? c.pushTekst,
    cadeauBeloningId: d.cadeauBeloningId === null || d.cadeauBeloningId === '' ? null : str('cadeauBeloningId') ?? c.cadeauBeloningId,
    herhaling: ['GEEN', 'WEKELIJKS', 'MAANDELIJKS'].includes(String(d.herhaling)) ? String(d.herhaling) : c.herhaling,
    minDagenTussen: typeof d.minDagenTussen === 'number' ? Math.max(0, Math.round(d.minDagenTussen)) : c.minDagenTussen,
    ...(c.type === 'AUTOMATISCH' && trig?.soort ? { trigger: { soort: trig.soort, dagen: Number(trig.dagen) || 0, uren: Number(trig.uren) || 0 } } : {}),
  } })
  return ok({ ok: true })
})

export const DELETE = api(async (_req, { params }) => {
  await vereisAdmin()
  const c = await prisma.campagne.findUnique({ where: { id: params.id } })
  if (!c) return fout('Niet gevonden', 404)
  if (c.systeemSleutel) return fout('Standaard-automatisaties kan je niet verwijderen, wel pauzeren.')
  await prisma.campagne.delete({ where: { id: c.id } })
  return ok({ ok: true })
})
