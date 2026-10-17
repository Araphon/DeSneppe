import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisKlant } from '@/lib/api'

// Verzilveren: maakt een voucher met QR-code. De punten gaan pas van de teller als de kassa de QR scant.
export const POST = api(async req => {
  const k = await vereisKlant()
  const { beloningId } = await body<{ beloningId?: string }>(req)
  const bel = await prisma.loyaltyBeloning.findUnique({ where: { id: String(beloningId || '') } })
  if (!bel || !bel.actief) return fout('Deze beloning bestaat niet meer.')
  const open = await prisma.voucher.aggregate({ where: { klantId: k.id, status: 'OPEN' }, _sum: { punten: true } })
  if (k.punten - (open._sum.punten || 0) < bel.punten) return fout('Je hebt nog niet genoeg punten voor deze beloning.')
  const code = 'SN-' + crypto.randomBytes(5).toString('hex').toUpperCase()
  const v = await prisma.voucher.create({ data: { code, klantId: k.id, beloningId: bel.id, punten: bel.punten } })
  return ok(v)
})
