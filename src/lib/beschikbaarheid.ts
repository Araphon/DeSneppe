// Beschikbaarheid van een product op een afhaalmoment. Zuivere functies: bruikbaar op server én in de browser.
export type BeschikbaarRegels = { dagen: number[]; van: string | null; tot: string | null; seizoenVan: string | null; seizoenTot: string | null }

const DAG = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const MAAND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function weekdag(datum: string) {
  const [y, m, d] = datum.split('-').map(Number)
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return w === 0 ? 7 : w
}

export function inSeizoen(r: BeschikbaarRegels, datum: string) {
  if (!r.seizoenVan || !r.seizoenTot) return true
  const md = datum.slice(5)
  return r.seizoenVan <= r.seizoenTot ? md >= r.seizoenVan && md <= r.seizoenTot : md >= r.seizoenVan || md <= r.seizoenTot
}

// Waarom is het product niet beschikbaar op `datum` om `tijd`? null = wel beschikbaar
export function nietBeschikbaarReden(r: BeschikbaarRegels, datum: string, tijd?: string): string | null {
  if (!inSeizoen(r, datum)) return 'buiten het seizoen'
  if (r.dagen.length && !r.dagen.includes(weekdag(datum))) return `enkel op ${r.dagen.map(d => DAG[d - 1]).join(', ')}`
  if (tijd && r.van && tijd < r.van) return `pas vanaf ${r.van}`
  if (tijd && r.tot && tijd > r.tot) return `enkel tot ${r.tot}`
  return null
}

function md(s: string) { const [m, d] = s.split('-').map(Number); return `${d} ${MAAND[m - 1]}` }

// Korte tekst voor een badge op de producttegel
export function beschikbaarBadge(r: BeschikbaarRegels): string | null {
  const delen: string[] = []
  if (r.dagen.length && r.dagen.length < 7) delen.push(`Enkel ${r.dagen.map(d => DAG[d - 1]).join(', ')}`)
  if (r.van && r.tot) delen.push(`${r.van}–${r.tot}`)
  else if (r.tot) delen.push(`Tot ${r.tot}`)
  else if (r.van) delen.push(`Vanaf ${r.van}`)
  return delen.length ? delen.join(' · ') : null
}

export function seizoenTekst(r: BeschikbaarRegels): string | null {
  return r.seizoenVan && r.seizoenTot ? `${md(r.seizoenVan)} – ${md(r.seizoenTot)}` : null
}

export function regelsVan(p: { beschikbaarDagen: number[]; beschikbaarVan: string | null; beschikbaarTot: string | null; seizoenVan: string | null; seizoenTot: string | null }): BeschikbaarRegels {
  return { dagen: p.beschikbaarDagen, van: p.beschikbaarVan, tot: p.beschikbaarTot, seizoenVan: p.seizoenVan, seizoenTot: p.seizoenTot }
}
