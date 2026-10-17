import crypto from 'crypto'
import { prisma } from './db'
import { stuurMail } from './mail'
import { SITE } from './site'

export async function nodigUit(id: string, doorNaam: string) {
  const token = crypto.randomBytes(24).toString('hex')
  const a = await prisma.adminGebruiker.update({ where: { id }, data: { uitnodigToken: token, uitnodigTot: new Date(Date.now() + 7 * 86400000) } })
  const link = `${SITE}/admin/uitnodiging?token=${token}`
  const verstuurd = await stuurMail(a.email, 'Uitnodiging beheer De Sneppe', `Hallo ${a.naam}!`, [
    `${doorNaam} nodigt je uit als beheerder van de website en bestellingen van De Sneppe.`,
    'Klik op de knop om je wachtwoord te kiezen. De link is 7 dagen geldig.',
  ], { tekst: 'Wachtwoord kiezen', url: link })
  return { link, verstuurd }
}

export async function aantalActieveBeheerders() {
  return prisma.adminGebruiker.count({ where: { actief: true, wachtwoord: { not: null } } })
}
