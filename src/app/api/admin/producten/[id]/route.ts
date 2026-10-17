import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { adminProductInclude, productSchema, slaProductOp } from '@/lib/productOpslaan'

export const dynamic = 'force-dynamic'

export const GET = api(async (_req, { params }) => {
  await vereisAdmin()
  const p = await prisma.product.findUnique({ where: { id: params.id }, include: adminProductInclude })
  if (!p) return fout('Niet gevonden', 404)
  return ok({ ...p, prijsExcl: Number(p.prijsExcl), btwPct: Number(p.btwPct), labelIds: p.labels.map(l => l.labelId) })
})

export const PUT = api(async (req, { params }) => {
  await vereisAdmin()
  const p = productSchema.safeParse(await body(req))
  if (!p.success) return fout(p.error.issues[0].message)
  await slaProductOp(p.data, params.id)
  return ok({ id: params.id })
})

export const DELETE = api(async (_req, { params }) => {
  await vereisAdmin()
  await prisma.product.delete({ where: { id: params.id } })
  return ok({ ok: true })
})
