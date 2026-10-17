import type { Klant } from '@prisma/client'
import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { ontvangersVan, verstuurAanKlanten } from '@/lib/marketing'

// { actie: 'test' | 'nu' | 'plan' | 'activeer' | 'pauzeer' | 'annuleerplanning', email?, geplandOp? }
export const POST = api(async (req, { params }) => {
  const admin = await vereisAdmin()
  const c = await prisma.campagne.findUnique({ where: { id: params.id } })
  if (!c) return fout('Niet gevonden', 404)
  const d = await body<{ actie?: string; email?: string; geplandOp?: string }>(req)
  switch (d.actie) {
    case 'test': {
      const naar = String(d.email || admin.email).trim()
      const nep = { id: 'test', email: naar, voornaam: admin.naam.split(' ')[0], naam: '', punten: 120 } as Klant
      await verstuurAanKlanten(c, [nep], { test: true })
      return ok({ bericht: process.env.SMTP_HOST ? `Testmail verstuurd naar ${naar}.` : 'E-mail is nog niet ingesteld: de testmail kon niet vertrekken. Bekijk het voorbeeld hierboven.' })
    }
    case 'nu': {
      if (c.type !== 'EENMALIG') return fout('Enkel voor campagnes.')
      const r = await verstuurAanKlanten(c, await ontvangersVan(c))
      await prisma.campagne.update({ where: { id: c.id }, data: { status: c.herhaling === 'GEEN' ? 'VERZONDEN' : c.status } })
      return ok({ bericht: `${r.verzonden} verzonden${r.nietVerzonden ? `, ${r.nietVerzonden} niet verzonden (zie log)` : ''}${r.overgeslagen ? `, ${r.overgeslagen} overgeslagen` : ''}.` })
    }
    case 'plan': {
      const t = d.geplandOp ? new Date(d.geplandOp) : null
      if (!t || isNaN(t.getTime()) || t.getTime() < Date.now() - 60000) return fout('Kies een tijdstip in de toekomst.')
      await prisma.campagne.update({ where: { id: c.id }, data: { status: 'GEPLAND', geplandOp: t } })
      return ok({ bericht: 'Ingepland.' })
    }
    case 'annuleerplanning':
      await prisma.campagne.update({ where: { id: c.id }, data: { status: 'CONCEPT' } })
      return ok({ bericht: 'Planning geannuleerd.' })
    case 'activeer':
      if (c.type !== 'AUTOMATISCH') return fout('Enkel voor automatisaties.')
      await prisma.campagne.update({ where: { id: c.id }, data: { status: 'ACTIEF' } })
      return ok({ bericht: 'Automatisatie staat aan.' })
    case 'pauzeer':
      await prisma.campagne.update({ where: { id: c.id }, data: { status: 'GEPAUZEERD' } })
      return ok({ bericht: 'Gepauzeerd.' })
  }
  return fout('Onbekende actie')
})
