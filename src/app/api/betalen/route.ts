import { api, ok } from '@/lib/api'
import { getInstellingen } from '@/lib/instellingen'
import { huidigeKlant } from '@/lib/auth'
import { aanKassaGeweigerd, turnstileSiteKey } from '@/lib/misbruik'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
// Publieke betaalopties voor de afrekenpagina (zonder geheimen)
export const GET = api(async () => {
  const { betalen: b } = await getInstellingen()
  const inst = await getInstellingen()
  const online = b.onlineActief && Boolean(b.mollieApiKey)
  const klant = await huidigeKlant()
  const kassaReden = klant ? await aanKassaGeweigerd(klant, inst) : null
  return ok({
    online,
    aanKassa: (b.aanKassaActief || !online) && !kassaReden,
    aanKassaReden: kassaReden,
    maxEersteBestellingCent: inst.bestellen.maxEersteBestellingCent,
    geblokkeerd: Boolean(klant?.geblokkeerd),
    nieuweKlant: klant ? (await prisma.bestelling.count({ where: { klantId: klant.id, status: { in: ['AFGEHAALD', 'KLAAR'] } } })) === 0 : true,
    turnstileSiteKey: turnstileSiteKey(),
    transactiekostCent: b.servicekostActief ? b.transactiekostCent : 0,
    onlineVanafCent: online ? b.onlineVanafCent : 0,
    transactiekostOnderCent: b.transactiekostOnderCent,
    transactiekostLabel: b.transactiekostLabel,
  })
})
