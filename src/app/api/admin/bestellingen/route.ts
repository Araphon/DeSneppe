import { prisma } from '@/lib/db'
import { api, ok, vereisAdmin } from '@/lib/api'
import { datumNaarDb, datumPlus, vandaagLokaal } from '@/lib/tijd'
import { ZICHTBAAR_OP_KASSA } from '@/lib/bestelling'

export const dynamic = 'force-dynamic'

// GET ?datum=YYYY-MM-DD (standaard vandaag) → bestellingen met afhaaldag = datum; ?open=1 → ook alle nog niet afgewerkte
export const GET = api(async req => {
  await vereisAdmin()
  const u = new URL(req.url)
  const datum = u.searchParams.get('datum') || vandaagLokaal()
  const lijst = await prisma.bestelling.findMany({
    where: { dag: { gte: datumNaarDb(datum), lt: datumNaarDb(datumPlus(datum, 1)) }, ...ZICHTBAAR_OP_KASSA },
    include: { regels: true },
    orderBy: [{ afhaalTijd: 'asc' }, { nummer: 'asc' }],
  })
  return ok(lijst, { headers: { 'Cache-Control': 'no-store' } })
})
