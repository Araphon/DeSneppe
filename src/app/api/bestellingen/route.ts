import { api, body, fout, ok, vereisKlant } from '@/lib/api'
import { BestelFout, maakBestelling, meldNieuweBestelling, startBetaling, stuurStatusMail, type InRegel } from '@/lib/bestelling'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/auth'
import { clientIp } from '@/lib/misbruik'
import { getInstellingen } from '@/lib/instellingen'
import { isApp } from '@/lib/app'

export const POST = api(async req => {
  const klant = await vereisKlant()
  if (!klant.adres || !klant.telefoon || !klant.geboortedatum || !klant.postcode) return fout('Vul eerst je gegevens aan in je account (adres, telefoon, geboortedatum).', 400)
  if (klant.geblokkeerd) return fout('Je account kan momenteel niet bestellen. Neem contact met ons op.', 403)
  if (!rateLimit('best:' + clientIp(req), 15, 60 * 60000) || !rateLimit('bestk:' + klant.id, 8, 60 * 60000)) return fout('Te veel bestellingen op korte tijd. Bel ons gerust als je meer wil bestellen.', 429)
  const inst = await getInstellingen()
  if (!inst.bestellen.actief) return fout('Online bestellen is momenteel niet mogelijk.')
  const b = await body<{ regels?: InRegel[]; afhaalTijd?: string; opmerking?: string; betaalwijze?: string }>(req)
  const betaalwijze = b.betaalwijze === 'ONLINE' ? 'ONLINE' : 'AAN_KASSA'
  try {
    const best = await maakBestelling(klant, b.regels || [], String(b.afhaalTijd || ''), b.opmerking, betaalwijze)
    if (betaalwijze === 'ONLINE') {
      try {
        return ok({ id: best.id, betaalUrl: await startBetaling(best, isApp(req)) })
      } catch (e) {
        await prisma.bestelling.update({ where: { id: best.id }, data: { status: 'GEANNULEERD', betaalStatus: 'MISLUKT' } })
        console.error('[mollie] betaling starten', e)
        return fout('De online betaling kon niet gestart worden. Probeer opnieuw of kies betalen bij afhalen.')
      }
    }
    stuurStatusMail(best).catch(() => {})
    meldNieuweBestelling(best)
    return ok({ id: best.id })
  } catch (e) {
    if (e instanceof BestelFout) return fout(e.message)
    throw e
  }
})
