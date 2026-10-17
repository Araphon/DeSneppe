import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { api, body, fout, ok } from '@/lib/api'
import { rateLimit } from '@/lib/auth'
import { stuurMail } from '@/lib/mail'
import { SITE } from '@/lib/site'

export const POST = api(async req => {
  const { email } = await body<{ email?: string }>(req)
  const e = String(email || '').trim().toLowerCase()
  if (!rateLimit('reset:' + e, 4)) return fout('Te veel aanvragen. Probeer later opnieuw.', 429)
  const k = await prisma.klant.findUnique({ where: { email: e } })
  if (k) {
    const token = crypto.randomBytes(24).toString('hex')
    await prisma.klant.update({ where: { id: k.id }, data: { resetToken: token, resetTokenTot: new Date(Date.now() + 2 * 3600000) } })
    await stuurMail(k.email, 'Nieuw wachtwoord instellen – De Sneppe', 'Nieuw wachtwoord instellen', [
      `Hallo ${k.voornaam}, via onderstaande knop kies je een nieuw wachtwoord. De link is 2 uur geldig.`,
      'Heb je dit niet aangevraagd? Dan mag je deze mail negeren.',
    ], { tekst: 'Nieuw wachtwoord kiezen', url: `${SITE}/account/wachtwoord?token=${token}` })
  }
  return ok({ ok: true })
})
