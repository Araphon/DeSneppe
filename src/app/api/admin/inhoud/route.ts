import { prisma } from '@/lib/db'
import { api, body, ok, vereisAdmin } from '@/lib/api'
import { INHOUD_VELDEN, getInhoud } from '@/lib/inhoud'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
export const GET = api(async () => { await vereisAdmin(); return ok({ velden: INHOUD_VELDEN, waarden: await getInhoud() }) })

export const PUT = api(async req => {
  await vereisAdmin()
  const d = await body<Record<string, string>>(req)
  for (const v of INHOUD_VELDEN) {
    if (typeof d[v.sleutel] !== 'string') continue
    const waarde = d[v.sleutel].slice(0, 10000)
    await prisma.inhoud.upsert({ where: { sleutel: v.sleutel }, create: { sleutel: v.sleutel, waarde }, update: { waarde } })
  }
  revalidatePath('/', 'layout')
  return ok({ ok: true })
})
