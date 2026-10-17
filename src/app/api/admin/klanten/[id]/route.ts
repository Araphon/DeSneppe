import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'

export const dynamic = 'force-dynamic'
export const GET = api(async (_req, { params }) => {
  await vereisAdmin()
  const k = await prisma.klant.findUnique({
    where: { id: params.id },
    include: { bestellingen: { orderBy: { aangemaaktOp: 'desc' }, take: 30 }, transacties: { orderBy: { aangemaaktOp: 'desc' }, take: 30 } },
  })
  if (!k) return fout('Niet gevonden', 404)
  const { wachtwoord: _w, resetToken: _r, ...rest } = k
  return ok(rest)
})

// Punten manueel corrigeren: { punten: +/-n, reden }
export const POST = api(async (req, { params }) => {
  await vereisAdmin()
  const { punten, reden } = await body<{ punten?: number; reden?: string }>(req)
  const n = Math.round(Number(punten))
  if (!n) return fout('Vul een aantal punten in.')
  await prisma.$transaction([
    prisma.loyaltyTransactie.create({ data: { klantId: params.id, punten: n, reden: reden?.trim() || 'Manuele correctie' } }),
    prisma.klant.update({ where: { id: params.id }, data: { punten: { increment: n } } }),
  ])
  return ok({ ok: true })
})

// { alleenOnline?, geblokkeerd?, noShowsReset? }
export const PUT = api(async (req, { params }) => {
  await vereisAdmin()
  const d = await body<{ alleenOnline?: boolean; geblokkeerd?: boolean; noShowsReset?: boolean }>(req)
  await prisma.klant.update({
    where: { id: params.id },
    data: {
      ...(typeof d.alleenOnline === 'boolean' ? { alleenOnline: d.alleenOnline } : {}),
      ...(typeof d.geblokkeerd === 'boolean' ? { geblokkeerd: d.geblokkeerd } : {}),
      ...(d.noShowsReset ? { noShows: 0 } : {}),
    },
  })
  return ok({ ok: true })
})
