import { prisma } from '@/lib/db'
import { api, fout, ok } from '@/lib/api'
import { huidigeAdmin, huidigeKlant } from '@/lib/auth'
import { syncBetaling } from '@/lib/bestelling'

export const dynamic = 'force-dynamic'
export const GET = api(async (_req, { params }) => {
  const [k, a] = await Promise.all([huidigeKlant(), huidigeAdmin()])
  const b = await prisma.bestelling.findUnique({ where: { id: params.id }, include: { regels: true } })
  if (!b || (!a && (!k || b.klantId !== k.id))) return fout('Niet gevonden', 404)
  // Terug van Mollie maar webhook nog niet binnen? Dan zelf de status opvragen.
  if (b.betaalStatus === 'OPEN' && b.molliePaymentId) {
    try { await syncBetaling(b.molliePaymentId) } catch (e) { console.error('[mollie] sync', e) }
    return ok(await prisma.bestelling.findUnique({ where: { id: b.id }, include: { regels: true } }))
  }
  return ok(b)
})
