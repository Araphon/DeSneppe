import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'

// POST { code } → opzoeken; POST { code, inwisselen: true } → punten aftrekken en voucher afsluiten
export const POST = api(async req => {
  await vereisAdmin()
  const { code, inwisselen } = await body<{ code?: string; inwisselen?: boolean }>(req)
  const c = String(code || '').trim().toUpperCase()
  const v = await prisma.voucher.findUnique({ where: { code: c }, include: { beloning: true, klant: true } })
  if (!v) return fout('Onbekende voucher.', 404)
  const info = { id: v.id, code: v.code, status: v.status, punten: v.punten, beloning: v.beloning.naam, klant: `${v.klant.voornaam} ${v.klant.naam}`, klantPunten: v.klant.punten, ingewisseldOp: v.ingewisseldOp }
  if (!inwisselen) return ok(info)
  if (v.status !== 'OPEN') return fout(v.status === 'INGEWISSELD' ? 'Deze voucher werd al ingewisseld.' : 'Deze voucher is niet meer geldig.')
  if (v.klant.punten < v.punten) return fout('De klant heeft niet genoeg punten meer.')
  await prisma.$transaction(async tx => {
    const upd = await tx.voucher.updateMany({ where: { id: v.id, status: 'OPEN' }, data: { status: 'INGEWISSELD', ingewisseldOp: new Date() } })
    if (upd.count !== 1) throw new Error('al ingewisseld')
    await tx.klant.update({ where: { id: v.klantId }, data: { punten: { decrement: v.punten } } })
    await tx.loyaltyTransactie.create({ data: { klantId: v.klantId, punten: -v.punten, reden: `Ingewisseld: ${v.beloning.naam}`, voucherId: v.id } })
  })
  return ok({ ...info, status: 'INGEWISSELD', klantPunten: v.klant.punten - v.punten })
})
