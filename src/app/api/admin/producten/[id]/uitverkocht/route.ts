import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { datumPlus, lokaalNaarUtc, vandaagLokaal, weekdag } from '@/lib/tijd'

// modus: vandaag | week | periode (tot = YYYY-MM-DD, t.e.m.) | manueel | terug
export const PUT = api(async (req, { params }) => {
  await vereisAdmin()
  const { modus, tot } = await body<{ modus?: string; tot?: string }>(req)
  const vandaag = vandaagLokaal()
  let data: { uitverkocht: boolean; uitverkochtTot: Date | null }
  switch (modus) {
    case 'terug': data = { uitverkocht: false, uitverkochtTot: null }; break
    case 'vandaag': data = { uitverkocht: true, uitverkochtTot: lokaalNaarUtc(datumPlus(vandaag, 1)) }; break
    case 'week': data = { uitverkocht: true, uitverkochtTot: lokaalNaarUtc(datumPlus(vandaag, 8 - weekdag(vandaag))) }; break
    case 'periode':
      if (!tot || !/^\d{4}-\d{2}-\d{2}$/.test(tot) || tot < vandaag) return fout('Kies een geldige einddatum.')
      data = { uitverkocht: true, uitverkochtTot: lokaalNaarUtc(datumPlus(tot, 1)) }; break
    case 'manueel': data = { uitverkocht: true, uitverkochtTot: null }; break
    default: return fout('Ongeldige keuze')
  }
  await prisma.product.update({ where: { id: params.id }, data })
  return ok(data)
})
