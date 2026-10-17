import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'

export const PUT = api(async (req, { params }) => {
  await vereisAdmin()
  const d = await body<{ naam?: string; omschrijving?: string; punten?: number; afbeelding?: string; actief?: boolean }>(req)
  if (!d.naam?.trim() || !(Number(d.punten) > 0)) return fout('Vul een naam en een aantal punten in.')
  return ok(await prisma.loyaltyBeloning.update({ where: { id: params.id }, data: { naam: d.naam.trim(), omschrijving: d.omschrijving?.trim() || null, punten: Math.round(Number(d.punten)), afbeelding: d.afbeelding || null, actief: d.actief !== false } }))
})

export const DELETE = api(async (_req, { params }) => {
  await vereisAdmin()
  const gebruikt = await prisma.voucher.count({ where: { beloningId: params.id } })
  if (gebruikt) {
    await prisma.voucher.updateMany({ where: { beloningId: params.id, status: 'OPEN' }, data: { status: 'GEANNULEERD' } })
    await prisma.loyaltyBeloning.update({ where: { id: params.id }, data: { actief: false } })
    return ok({ gedeactiveerd: true })
  }
  await prisma.loyaltyBeloning.delete({ where: { id: params.id } })
  return ok({ ok: true })
})
