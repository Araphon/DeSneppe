import type { Bestelling, BestellingRegel } from '@prisma/client'
import { prisma } from './db'
import { datumNaarDb, datumPlus, dagenTussen, lokaleDelen, weekdag } from './tijd'

type B = Bestelling & { regels: BestellingRegel[] }

// Telt een bestelling mee als omzet?
export function telt(b: Bestelling) {
  if (b.status === 'GEANNULEERD') return false
  if (b.betaalwijze === 'ONLINE') return b.betaalStatus === 'BETAALD'
  return b.status !== 'NIET_AFGEHAALD'
}

async function haal(van: string, tot: string): Promise<B[]> {
  return prisma.bestelling.findMany({
    where: { dag: { gte: datumNaarDb(van), lte: datumNaarDb(tot) } },
    include: { regels: true },
    orderBy: { afhaalTijd: 'asc' },
  })
}

export type Granulariteit = 'uur' | 'dag' | 'week' | 'maand'

function bucketSleutel(b: Bestelling, g: Granulariteit): string {
  const l = lokaleDelen(b.afhaalTijd)
  if (g === 'uur') return String(l.uur).padStart(2, '0')
  if (g === 'dag') return l.datum
  if (g === 'maand') return l.datum.slice(0, 7)
  return datumPlus(l.datum, 1 - weekdag(l.datum)) // maandag van die week
}

function buckets(van: string, tot: string, g: Granulariteit): string[] {
  const res: string[] = []
  if (g === 'uur') { for (let u = 5; u <= 20; u++) res.push(String(u).padStart(2, '0')); return res }
  if (g === 'dag') { for (let d = van; d <= tot; d = datumPlus(d, 1)) res.push(d); return res }
  if (g === 'maand') { for (let d = van.slice(0, 7) + '-01'; d <= tot; d = datumPlus(d.slice(0, 7) + '-28', 4).slice(0, 7) + '-01') res.push(d.slice(0, 7)); return res }
  for (let d = datumPlus(van, 1 - weekdag(van)); d <= tot; d = datumPlus(d, 7)) res.push(d)
  return res
}

function kpis(lijst: B[], eersteBestelling: Map<string, Date>, van: string) {
  const tellend = lijst.filter(telt)
  const omzet = tellend.reduce((s, b) => s + b.totaalCent, 0)
  const omzetExcl = tellend.reduce((s, b) => s + (b.totaalCent - b.btwCent), 0)
  const klanten = new Set(tellend.map(b => b.klantId).filter(Boolean) as string[])
  const vanaf = datumNaarDb(van)
  const nieuwe = Array.from(klanten).filter(id => { const e = eersteBestelling.get(id); return e && e >= vanaf }).length
  return {
    omzetCent: omzet,
    omzetExclCent: omzetExcl,
    bestellingen: tellend.length,
    gemiddeldCent: tellend.length ? Math.round(omzet / tellend.length) : 0,
    stuks: tellend.reduce((s, b) => s + b.regels.reduce((t, r) => t + r.aantal, 0), 0),
    klanten: klanten.size,
    nieuweKlanten: nieuwe,
    terugkerendPct: klanten.size ? Math.round(((klanten.size - nieuwe) / klanten.size) * 100) : 0,
    onlinePct: tellend.length ? Math.round((tellend.filter(b => b.betaalwijze === 'ONLINE').length / tellend.length) * 100) : 0,
    noShows: lijst.filter(b => b.status === 'NIET_AFGEHAALD').length,
    annulaties: lijst.filter(b => b.status === 'GEANNULEERD' && !(b.betaalwijze === 'ONLINE' && b.betaalStatus === 'MISLUKT')).length,
  }
}

function productStats(lijst: B[]) {
  const m = new Map<string, { naam: string; productId: string | null; aantal: number; omzetCent: number }>()
  for (const b of lijst.filter(telt)) for (const r of b.regels) {
    const k = r.productId || r.productNaam
    const x = m.get(k) || { naam: r.productNaam, productId: r.productId, aantal: 0, omzetCent: 0 }
    x.aantal += r.aantal; x.omzetCent += r.totaalCent
    m.set(k, x)
  }
  return m
}

export async function rapport(van: string, tot: string, vergelijk: 'vorige' | 'vorigjaar' | 'geen') {
  const dagen = dagenTussen(van, tot) + 1
  const g: Granulariteit = dagen === 1 ? 'uur' : dagen <= 62 ? 'dag' : dagen <= 190 ? 'week' : 'maand'
  let vVan = '', vTot = ''
  if (vergelijk === 'vorige') { vTot = datumPlus(van, -1); vVan = datumPlus(vTot, -(dagen - 1)) }
  if (vergelijk === 'vorigjaar') { vVan = `${Number(van.slice(0, 4)) - 1}${van.slice(4)}`; vTot = `${Number(tot.slice(0, 4)) - 1}${tot.slice(4)}` }

  const [huidig, vorig] = await Promise.all([haal(van, tot), vVan ? haal(vVan, vTot) : Promise.resolve([] as B[])])

  // eerste bestelling ooit per klant (voor nieuw vs terugkerend)
  const klantIds = Array.from(new Set([...huidig, ...vorig].map(b => b.klantId).filter(Boolean) as string[]))
  const eerste = new Map<string, Date>()
  if (klantIds.length) {
    const rows = await prisma.bestelling.groupBy({ by: ['klantId'], where: { klantId: { in: klantIds }, status: { not: 'GEANNULEERD' } }, _min: { dag: true } })
    for (const r of rows) if (r.klantId && r._min.dag) eerste.set(r.klantId, r._min.dag)
  }

  // tijdreeks
  const sleutels = buckets(van, tot, g)
  const vSleutels = vVan ? buckets(vVan, vTot, g) : []
  const som = (lijst: B[], keys: string[]) => {
    const m = new Map(keys.map(k => [k, { omzetCent: 0, bestellingen: 0 }]))
    for (const b of lijst.filter(telt)) { const x = m.get(bucketSleutel(b, g)); if (x) { x.omzetCent += b.totaalCent; x.bestellingen++ } }
    return keys.map(k => m.get(k)!)
  }
  const sh = som(huidig, sleutels), sv = som(vorig, vSleutels)
  const reeks = sleutels.map((k, i) => ({ sleutel: k, omzetCent: sh[i].omzetCent, bestellingen: sh[i].bestellingen, vorigOmzetCent: sv[i]?.omzetCent ?? null, vorigBestellingen: sv[i]?.bestellingen ?? null }))
    // dagen zonder enige verkoop in beide periodes (gesloten dagen) weglaten — anders zakt de lijn telkens naar nul
    .filter((r, i, a) => g !== 'dag' || a.length <= 1 || r.omzetCent > 0 || (r.vorigOmzetCent ?? 0) > 0)

  // drukte: weekdag × uur (afhaalmoment)
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0) as number[])
  for (const b of huidig.filter(telt)) { const l = lokaleDelen(b.afhaalTijd); heatmap[weekdag(l.datum) - 1][l.uur]++ }

  // producten + categorieën
  const ph = productStats(huidig), pv = productStats(vorig)
  const ids = Array.from(new Set([...Array.from(ph.values()), ...Array.from(pv.values())].map(p => p.productId).filter(Boolean) as string[]))
  const cats = new Map((await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, categorie: { select: { naam: true } } } })).map(p => [p.id, p.categorie.naam]))
  const producten = Array.from(ph.entries()).map(([k, p]) => ({ ...p, categorie: (p.productId && cats.get(p.productId)) || 'Overige', vorigAantal: pv.get(k)?.aantal ?? 0, vorigOmzetCent: pv.get(k)?.omzetCent ?? 0 }))
    .sort((a, b) => b.omzetCent - a.omzetCent)
  const catMap = new Map<string, { naam: string; omzetCent: number; aantal: number; vorigOmzetCent: number }>()
  for (const p of producten) { const c = catMap.get(p.categorie) || { naam: p.categorie, omzetCent: 0, aantal: 0, vorigOmzetCent: 0 }; c.omzetCent += p.omzetCent; c.aantal += p.aantal; catMap.set(p.categorie, c) }
  for (const [k, p] of Array.from(pv.entries())) { if (ph.has(k)) continue; const cn = (p.productId && cats.get(p.productId)) || 'Overige'; const c = catMap.get(cn) || { naam: cn, omzetCent: 0, aantal: 0, vorigOmzetCent: 0 }; catMap.set(cn, c) }
  for (const [, p] of Array.from(pv.entries())) { const cn = (p.productId && cats.get(p.productId)) || 'Overige'; const c = catMap.get(cn); if (c) c.vorigOmzetCent += p.omzetCent }
  const categorieen = Array.from(catMap.values()).sort((a, b) => b.omzetCent - a.omzetCent)

  // aanpassingen en opties
  const aanp = new Map<string, number>(), opt = new Map<string, number>()
  for (const b of huidig.filter(telt)) for (const r of b.regels) {
    for (const a of (r.aanpassingen as { naam: string }[]) || []) aanp.set(a.naam, (aanp.get(a.naam) || 0) + r.aantal)
    for (const k of (r.keuzes as { optie: string; keuze: string }[]) || []) { const n = `${k.optie}: ${k.keuze}`; opt.set(n, (opt.get(n) || 0) + r.aantal) }
  }
  const top = (m: Map<string, number>) => Array.from(m.entries()).map(([naam, aantal]) => ({ naam, aantal })).sort((a, b) => b.aantal - a.aantal).slice(0, 10)

  return {
    van, tot, vergelijkVan: vVan || null, vergelijkTot: vTot || null, granulariteit: g,
    kpi: kpis(huidig, eerste, van),
    vorigKpi: vVan ? kpis(vorig, eerste, vVan) : null,
    reeks, heatmap, producten, categorieen,
    aanpassingen: top(aanp), opties: top(opt),
  }
}

// CSV-export voor de boekhouder (één regel per bestelling)
export async function csvExport(van: string, tot: string) {
  const lijst = await haal(van, tot)
  const esc = (v: string | number) => { const s = String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const bedrag = (c: number) => (c / 100).toFixed(2).replace('.', ',')
  const kop = ['Afhaaldatum', 'Afhaaluur', 'Nummer', 'Klant', 'Status', 'Betaalwijze', 'Betaalstatus', 'Telt als omzet', 'Totaal incl. btw', 'Btw', 'Excl. btw', 'Servicekost', 'Producten']
  const rijen = lijst.map(b => {
    const l = lokaleDelen(b.afhaalTijd)
    return [l.datum, l.tijd, b.nummer, b.klantNaam, b.status, b.betaalwijze === 'ONLINE' ? 'Online' : 'Aan de kassa', b.betaalStatus, telt(b) ? 'ja' : 'nee',
      bedrag(b.totaalCent), bedrag(b.btwCent), bedrag(b.totaalCent - b.btwCent), bedrag(b.transactiekostCent),
      b.regels.map(r => `${r.aantal}x ${r.productNaam}`).join(', ')].map(esc).join(';')
  })
  return '﻿' + [kop.join(';'), ...rijen].join('\n')
}
