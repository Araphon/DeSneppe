import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { zorgVoorStandaard } from '@/lib/marketing'

export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  await vereisAdmin()
  await zorgVoorStandaard()
  const c = await prisma.campagne.findMany({ orderBy: [{ type: 'asc' }, { aangemaaktOp: 'desc' }], include: { onderwerp: true, klantgroep: true } })
  const stats = await prisma.verzending.groupBy({ by: ['campagneId', 'status'], _count: true })
  return ok(c.map(x => ({
    id: x.id, naam: x.naam, type: x.type, status: x.status, onderwerp: x.onderwerp.naam, klantgroep: x.klantgroep?.naam || null,
    viaMail: x.viaMail, viaPush: x.viaPush, geplandOp: x.geplandOp, herhaling: x.herhaling, trigger: x.trigger, laatstVerzonden: x.laatstVerzonden, systeem: Boolean(x.systeemSleutel),
    verzonden: stats.filter(s => s.campagneId === x.id && s.status === 'VERZONDEN').reduce((a, s) => a + s._count, 0),
    nietVerzonden: stats.filter(s => s.campagneId === x.id && s.status !== 'VERZONDEN').reduce((a, s) => a + s._count, 0),
  })))
})

export const POST = api(async req => {
  await vereisAdmin()
  const d = await body<{ naam?: string; type?: string; onderwerpId?: string }>(req)
  const ond = d.onderwerpId ? await prisma.meldingOnderwerp.findUnique({ where: { id: d.onderwerpId } }) : await prisma.meldingOnderwerp.findFirst({ where: { sleutel: 'acties' } })
  if (!ond) return fout('Kies een onderwerp.')
  const auto = d.type === 'AUTOMATISCH'
  return ok(await prisma.campagne.create({ data: {
    naam: d.naam?.trim() || (auto ? 'Nieuwe automatisatie' : 'Nieuwe campagne'), type: auto ? 'AUTOMATISCH' : 'EENMALIG', status: auto ? 'GEPAUZEERD' : 'CONCEPT',
    onderwerpId: ond.id, onderwerpRegel: 'Nieuws van De Sneppe', titel: 'Hallo {voornaam}!', tekst: 'Schrijf hier je bericht.',
    knopTekst: 'Bestel nu', knopUrl: '{site}/bestellen', trigger: auto ? { soort: 'INACTIEF', dagen: 60 } : undefined, minDagenTussen: auto ? 30 : 0,
  } }))
})
