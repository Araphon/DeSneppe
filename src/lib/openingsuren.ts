import type { OpeningsRegel } from '@prisma/client'
import { prisma } from './db'
import { datumPlus, datumUitDb, dagenTussen, minutenVanTijd, weekdag } from './tijd'

export type Interval = [number, number] // minuten sinds middernacht (lokaal)

// Is `datum` een startdatum van een (herhaalde) regel?
function isVoorkomen(r: OpeningsRegel, datum: string): boolean {
  const start = datumUitDb(r.startDatum)
  const diff = dagenTussen(start, datum)
  if (diff < 0) return false
  if (r.herhalingTot && datum > datumUitDb(r.herhalingTot)) return false
  const iv = Math.max(1, r.interval || 1)
  switch (r.herhaling) {
    case 'GEEN':
      return diff === 0
    case 'DAGELIJKS':
      return diff % iv === 0
    case 'WEKELIJKS': {
      const dagen = r.weekdagen.length ? r.weekdagen : [weekdag(start)]
      if (!dagen.includes(weekdag(datum))) return false
      // weken tellen vanaf de maandag van de startweek
      const maandagStart = datumPlus(start, 1 - weekdag(start))
      const weken = Math.floor(dagenTussen(maandagStart, datum) / 7)
      return weken % iv === 0
    }
    case 'MAANDELIJKS': {
      const [ys, ms, ds] = start.split('-').map(Number)
      const [y, m, d] = datum.split('-').map(Number)
      if (d !== ds) return false
      return ((y - ys) * 12 + (m - ms)) % iv === 0
    }
    case 'JAARLIJKS': {
      const [ys, ms, ds] = start.split('-').map(Number)
      const [y, m, d] = datum.split('-').map(Number)
      return m === ms && d === ds && (y - ys) % iv === 0
    }
  }
}

export function regelGeldtOp(r: OpeningsRegel, datum: string): boolean {
  const start = datumUitDb(r.startDatum)
  const duur = r.eindDatum ? Math.max(0, dagenTussen(start, datumUitDb(r.eindDatum))) : 0
  for (let k = 0; k <= duur; k++) {
    if (isVoorkomen(r, datumPlus(datum, -k))) return true
  }
  return false
}

function normaliseer(iv: Interval[]): Interval[] {
  const s = iv.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0])
  const out: Interval[] = []
  for (const i of s) {
    const last = out[out.length - 1]
    if (last && i[0] <= last[1]) last[1] = Math.max(last[1], i[1])
    else out.push([i[0], i[1]])
  }
  return out
}

function aftrekken(iv: Interval[], weg: Interval): Interval[] {
  const out: Interval[] = []
  for (const [a, b] of iv) {
    if (weg[1] <= a || weg[0] >= b) { out.push([a, b]); continue }
    if (weg[0] > a) out.push([a, weg[0]])
    if (weg[1] < b) out.push([weg[1], b])
  }
  return out
}

export type DagStatus = { datum: string; open: Interval[]; sluitingen: string[] }

export function berekenDag(regels: OpeningsRegel[], datum: string): DagStatus {
  let open: Interval[] = []
  const sluitingen: string[] = []
  for (const r of regels) {
    if (r.type !== 'OPEN' || !regelGeldtOp(r, datum) || !r.startTijd || !r.eindTijd) continue
    open.push([minutenVanTijd(r.startTijd), minutenVanTijd(r.eindTijd)])
  }
  open = normaliseer(open)
  for (const r of regels) {
    if (r.type !== 'GESLOTEN' || !regelGeldtOp(r, datum)) continue
    if (r.titel) sluitingen.push(r.titel)
    if (!r.startTijd || !r.eindTijd) open = []
    else open = aftrekken(open, [minutenVanTijd(r.startTijd), minutenVanTijd(r.eindTijd)])
  }
  return { datum, open, sluitingen }
}

export async function getRegels() {
  return prisma.openingsRegel.findMany({ orderBy: [{ type: 'asc' }, { startDatum: 'asc' }] })
}

// Standaard weekschema (voor schema.org / footer): eerstvolgende 7 dagen vanaf maandag van deze week,
// zonder rekening te houden met eenmalige sluitingen.
export function weekSchema(regels: OpeningsRegel[], vanafDatum: string) {
  const maandag = datumPlus(vanafDatum, 1 - weekdag(vanafDatum))
  const terugkerend = regels.filter(r => r.type === 'OPEN')
  // zoek een "gewone" week: neem week van vandaag maar negeer GESLOTEN-regels
  return Array.from({ length: 7 }, (_, i) => {
    const d = datumPlus(maandag, i)
    return { dag: i + 1, datum: d, open: berekenDag(terugkerend, d).open }
  })
}
