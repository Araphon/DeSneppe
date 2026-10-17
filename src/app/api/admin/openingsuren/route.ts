import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { berekenDag, getRegels } from '@/lib/openingsuren'
import { datumPlus } from '@/lib/tijd'
import { naarData, regelSchema } from '@/lib/openingsRegel'

export const dynamic = 'force-dynamic'

// GET ?van=YYYY-MM-DD&dagen=42 → regels + berekende kalender
export const GET = api(async req => {
  await vereisAdmin()
  const u = new URL(req.url)
  const van = u.searchParams.get('van') || new Date().toISOString().slice(0, 10)
  const dagen = Math.min(100, Number(u.searchParams.get('dagen') || 42))
  const regels = await getRegels()
  const kalender = Array.from({ length: dagen }, (_, i) => berekenDag(regels, datumPlus(van, i)))
  return ok({ regels, kalender })
})

export const POST = api(async req => {
  await vereisAdmin()
  const p = regelSchema.safeParse(await body(req))
  if (!p.success) return fout('Controleer de ingevulde velden.')
  try { return ok(await prisma.openingsRegel.create({ data: naarData(p.data) })) } catch (e) { return fout((e as Error).message) }
})
