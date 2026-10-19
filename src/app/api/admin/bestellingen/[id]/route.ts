import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { wijzigStatus } from '@/lib/bestelling'
import { demoZetStatus } from '@/lib/demo'

const STATUSSEN = ['ONTVANGEN', 'BEZIG', 'KLAAR', 'AFGEHAALD', 'NIET_AFGEHAALD', 'GEANNULEERD'] as const

export const PUT = api(async (req, { params }) => {
  const a = await vereisAdmin()
  const { status, geprint, terugbetalen } = await body<{ status?: string; geprint?: boolean; terugbetalen?: boolean }>(req)
  if (a.demo) {
    const s = STATUSSEN.find(x => x === status)
    if (!s) return ok({ ok: true })
    const d = demoZetStatus(params.id, s)
    return d ? ok(d) : fout('Niet gevonden', 404)
  }
  if (geprint) {
    await prisma.bestelling.update({ where: { id: params.id }, data: { geprintOp: new Date() } })
    if (!status) return ok({ ok: true })
  }
  const s = STATUSSEN.find(x => x === status)
  if (!s) return fout('Ongeldige status')
  let b
  try { b = await wijzigStatus(params.id, s, { terugbetalen }) } catch (e) { return fout(`Terugbetalen via Mollie mislukt: ${(e as Error).message}`) }
  if (!b) return fout('Niet gevonden', 404)
  return ok(b)
})
