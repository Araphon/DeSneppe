import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { getInstellingen, setInstelling } from '@/lib/instellingen'
import { berekenDag, getRegels } from '@/lib/openingsuren'
import { ZICHTBAAR_OP_KASSA } from '@/lib/bestelling'
import { datumNaarDb, lokaalNaarUtc, lokaleDelen, tijdVanMinuten, vandaagLokaal } from '@/lib/tijd'

export const dynamic = 'force-dynamic'

// GET ?datum= → alle afhaalmomenten van die dag met bestellingen + blokkades + pauzestatus
export const GET = api(async req => {
  await vereisAdmin()
  const datum = new URL(req.url).searchParams.get('datum') || vandaagLokaal()
  const [inst, regels, blok] = await Promise.all([getInstellingen(), getRegels(), prisma.slotBlokkade.findMany({ where: { datum: datumNaarDb(datum) } })])
  const stap = Math.max(5, inst.bestellen.slotMinuten)
  const dag = berekenDag(regels, datum)
  const tijden: string[] = []
  for (const [a, z] of dag.open) for (let m = a; m < z && m <= z - inst.bestellen.laatsteSlotVoorSluitenMinuten; m += stap) tijden.push(tijdVanMinuten(m))
  const bestellingen = tijden.length ? await prisma.bestelling.findMany({
    where: { afhaalTijd: { gte: lokaalNaarUtc(datum, tijden[0]), lt: new Date(lokaalNaarUtc(datum, tijden[tijden.length - 1]).getTime() + stap * 60000) }, status: { not: 'GEANNULEERD' }, ...ZICHTBAAR_OP_KASSA },
    select: { afhaalTijd: true, totaalCent: true },
  }) : []
  const nu = Date.now()
  const geblokkeerd = new Set(blok.map(b => b.tijd))
  const slots = tijden.map(tijd => {
    const start = lokaalNaarUtc(datum, tijd).getTime()
    const inSlot = bestellingen.filter(b => b.afhaalTijd.getTime() >= start && b.afhaalTijd.getTime() < start + stap * 60000)
    return { tijd, voorbij: start + stap * 60000 < nu, geblokkeerd: geblokkeerd.has(tijd), aantal: inSlot.length, omzetCent: inSlot.reduce((s, b) => s + b.totaalCent, 0) }
  })
  return ok({ datum, slotMinuten: stap, bestellenActief: inst.bestellen.actief, slots, nu: lokaleDelen(new Date()).tijd })
})

// PUT { datum, geblokkeerd: ["11:00", ...] } en/of { bestellenActief }
export const PUT = api(async req => {
  await vereisAdmin()
  const d = await body<{ datum?: string; geblokkeerd?: string[]; bestellenActief?: boolean }>(req)
  if (typeof d.bestellenActief === 'boolean') {
    const inst = await getInstellingen()
    await setInstelling('bestellen', { ...inst.bestellen, actief: d.bestellenActief })
  }
  if (d.datum && Array.isArray(d.geblokkeerd)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.datum)) return fout('Ongeldige datum')
    const tijden = Array.from(new Set(d.geblokkeerd.filter(t => /^\d{2}:\d{2}$/.test(t))))
    const datum = datumNaarDb(d.datum)
    await prisma.$transaction([
      prisma.slotBlokkade.deleteMany({ where: { datum, tijd: { notIn: tijden } } }),
      ...tijden.map(tijd => prisma.slotBlokkade.upsert({ where: { datum_tijd: { datum, tijd } }, create: { datum, tijd }, update: {} })),
    ])
  }
  return ok({ ok: true })
})
