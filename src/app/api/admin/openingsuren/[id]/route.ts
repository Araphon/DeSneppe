import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { naarData, regelSchema } from '@/lib/openingsRegel'

export const PUT = api(async (req, { params }) => {
  await vereisAdmin()
  const p = regelSchema.safeParse(await body(req))
  if (!p.success) return fout('Controleer de ingevulde velden.')
  try { return ok(await prisma.openingsRegel.update({ where: { id: params.id }, data: naarData(p.data) })) } catch (e) { return fout((e as Error).message) }
})

export const DELETE = api(async (_req, { params }) => {
  await vereisAdmin()
  await prisma.openingsRegel.delete({ where: { id: params.id } })
  return ok({ ok: true })
})
