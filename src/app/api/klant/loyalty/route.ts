import { prisma } from '@/lib/db'
import { api, ok, vereisKlant } from '@/lib/api'

export const dynamic = 'force-dynamic'
export const GET = api(async () => {
  const k = await vereisKlant()
  const [beloningen, vouchers, transacties] = await Promise.all([
    prisma.loyaltyBeloning.findMany({ where: { actief: true }, orderBy: [{ punten: 'asc' }] }),
    prisma.voucher.findMany({ where: { klantId: k.id }, include: { beloning: true }, orderBy: { aangemaaktOp: 'desc' }, take: 30 }),
    prisma.loyaltyTransactie.findMany({ where: { klantId: k.id }, orderBy: { aangemaaktOp: 'desc' }, take: 30 }),
  ])
  const gereserveerd = vouchers.filter(v => v.status === 'OPEN').reduce((s, v) => s + v.punten, 0)
  return ok({ punten: k.punten, beschikbaar: k.punten - gereserveerd, beloningen, vouchers, transacties })
})
