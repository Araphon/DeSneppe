import { prisma } from '@/lib/db'
import { api, fout, ok, vereisKlant } from '@/lib/api'
import { startBetaling, syncBetaling } from '@/lib/bestelling'
import { mollie } from '@/lib/mollie'
import { isSlotVrij } from '@/lib/tijdslots'
import { isApp } from '@/lib/app'

// Mislukte/afgebroken online betaling opnieuw proberen (zolang het tijdslot nog vrij is)
export const POST = api(async (req, { params }) => {
  const k = await vereisKlant()
  const b = await prisma.bestelling.findUnique({ where: { id: params.id } })
  if (!b || b.klantId !== k.id) return fout('Niet gevonden', 404)
  if (b.betaalwijze !== 'ONLINE' || !['MISLUKT', 'OPEN'].includes(b.betaalStatus)) return fout('Deze bestelling hoeft niet meer betaald te worden.')
  // Staat de vorige betaling nog open? Dan diezelfde hervatten (anders kan de klant dubbel betalen)
  if (b.betaalStatus === 'OPEN' && b.molliePaymentId) {
    const m = await mollie()
    const p = m ? await m.payments.get(b.molliePaymentId) : null
    if (p?.status === 'open' && p.getCheckoutUrl()) return ok({ betaalUrl: p.getCheckoutUrl() })
    const na = await syncBetaling(b.molliePaymentId)
    if (na?.betaalStatus === 'BETAALD') return ok({ betaald: true })
    if (p && ['pending', 'authorized'].includes(p.status)) return fout('Je betaling wordt nog verwerkt. Even geduld.')
  }
  const actueel = await prisma.bestelling.findUnique({ where: { id: b.id } })
  if (!actueel || actueel.betaalStatus === 'BETAALD') return ok({ betaald: true })
  if (actueel.betaalStatus === 'MISLUKT' && !(await isSlotVrij(b.afhaalTijd.toISOString()))) return fout('Het gekozen afhaalmoment is intussen volzet of voorbij. Plaats de bestelling opnieuw met een ander tijdstip.')
  const nieuw = await prisma.bestelling.update({ where: { id: b.id }, data: { status: 'ONTVANGEN', betaalStatus: 'OPEN', aangemaaktOp: new Date() } })
  return ok({ betaalUrl: await startBetaling(nieuw, isApp(req)) })
})
