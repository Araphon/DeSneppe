import { api, body, ok, vereisAdmin } from '@/lib/api'
import { prisma } from '@/lib/db'

// Automatisch printen met meerdere kassa-toestellen: wie de bestelling als eerste "claimt", print ze.
// Mislukt het printen, dan geeft het toestel de claim vrij zodat een ander (of een nieuwe poging) kan printen.
export const POST = api(async (req, { params }) => {
  const a = await vereisAdmin()
  if (a.demo) return ok({ geclaimd: false, ok: true }) // demo: nooit automatisch printen
  const b = await body<{ vrijgeven?: boolean }>(req)
  if (b.vrijgeven) {
    await prisma.bestelling.updateMany({ where: { id: params.id }, data: { geprintOp: null } })
    return ok({ ok: true })
  }
  const r = await prisma.bestelling.updateMany({ where: { id: params.id, geprintOp: null }, data: { geprintOp: new Date() } })
  return ok({ geclaimd: r.count === 1 })
})
