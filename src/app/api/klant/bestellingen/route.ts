import { prisma } from '@/lib/db'
import { api, ok, vereisKlant } from '@/lib/api'

export const dynamic = 'force-dynamic'
export const GET = api(async () => {
  const k = await vereisKlant()
  const lijst = await prisma.bestelling.findMany({ where: { klantId: k.id }, include: { regels: true }, orderBy: { aangemaaktOp: 'desc' }, take: 50 })
  return ok(lijst)
})
