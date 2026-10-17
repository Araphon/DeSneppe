import { prisma } from './db'
import { getInstellingen } from './instellingen'
import { berekenDag, getRegels } from './openingsuren'
import { datumNaarDb, datumPlus, lokaalNaarUtc, tijdVanMinuten, vandaagLokaal } from './tijd'

export type Slot = { tijd: string; iso: string; vrij: boolean; geblokkeerd?: boolean }
export type DagSlots = { datum: string; open: boolean; sluiting?: string; slots: Slot[] }

export async function getDagSlots(datum: string, extraCent = 0): Promise<DagSlots> {
  const [inst, regels] = await Promise.all([getInstellingen(), getRegels()])
  const b = inst.bestellen
  const dag = berekenDag(regels, datum)
  if (!dag.open.length) return { datum, open: false, sluiting: dag.sluitingen[0], slots: [] }

  const stap = Math.max(5, b.slotMinuten)
  const vroegst = Date.now() + b.minVoorbereidingMinuten * 60000
  const kandidaten: { tijd: string; start: Date }[] = []
  for (const [a, z] of dag.open) {
    for (let m = a; m <= z - Math.max(b.laatsteSlotVoorSluitenMinuten, 0) && m < z; m += stap) {
      const tijd = tijdVanMinuten(m)
      const start = lokaalNaarUtc(datum, tijd)
      if (start.getTime() >= vroegst) kandidaten.push({ tijd, start })
    }
  }
  if (!kandidaten.length) return { datum, open: true, slots: [] }

  const vanaf = kandidaten[0].start
  const tot = new Date(kandidaten[kandidaten.length - 1].start.getTime() + stap * 60000)
  const geblokkeerd = new Set((await prisma.slotBlokkade.findMany({ where: { datum: datumNaarDb(datum) }, select: { tijd: true } })).map(x => x.tijd))
  const bestellingen = await prisma.bestelling.findMany({
    where: {
      afhaalTijd: { gte: vanaf, lt: tot }, status: { not: 'GEANNULEERD' },
      // een openstaande online betaling houdt het slot maximaal 20 minuten vast
      NOT: { betaalwijze: 'ONLINE', betaalStatus: { in: ['OPEN', 'MISLUKT'] }, aangemaaktOp: { lt: new Date(Date.now() - 20 * 60000) } },
    },
    select: { afhaalTijd: true, totaalCent: true },
  })

  const slots = kandidaten.map(({ tijd, start }) => {
    const eind = start.getTime() + stap * 60000
    const inSlot = bestellingen.filter(x => x.afhaalTijd.getTime() >= start.getTime() && x.afhaalTijd.getTime() < eind)
    const som = inSlot.reduce((s, x) => s + x.totaalCent, 0)
    let vrij = true
    if (b.capaciteitCentPerSlot > 0 && som >= b.capaciteitCentPerSlot) vrij = false
    if (b.maxBestellingenPerSlot > 0 && inSlot.length >= b.maxBestellingenPerSlot) vrij = false
    void extraCent
    if (geblokkeerd.has(tijd)) return { tijd, iso: start.toISOString(), vrij: false, geblokkeerd: true }
    return { tijd, iso: start.toISOString(), vrij }
  })
  return { datum, open: true, slots }
}

export async function getBestelDagen(): Promise<DagSlots[]> {
  const inst = await getInstellingen()
  const vandaag = vandaagLokaal()
  const res: DagSlots[] = []
  for (let i = 0; i <= inst.bestellen.maxDagenVooruit; i++) {
    res.push(await getDagSlots(datumPlus(vandaag, i)))
  }
  return res
}

export async function isSlotVrij(iso: string): Promise<boolean> {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
  const { lokaleDelen } = await import('./tijd')
  const l = lokaleDelen(d)
  const dag = await getDagSlots(l.datum)
  return dag.slots.some(s => s.iso === d.toISOString() && s.vrij)
}
