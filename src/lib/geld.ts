// Bedragen worden overal als centen (incl. btw) bewaard, behalve Product.prijsExcl.

export function euro(cent: number): string {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(cent / 100)
}

export function euroDelta(cent: number): string {
  if (cent === 0) return ''
  return (cent > 0 ? '+ ' : '− ') + euro(Math.abs(cent))
}

export function inclVanExcl(excl: number, btwPct: number): number {
  return Math.round(excl * (1 + btwPct / 100) * 100) / 100
}

export function exclVanIncl(incl: number, btwPct: number): number {
  return Math.round((incl / (1 + btwPct / 100)) * 10000) / 10000
}

export function productPrijsCent(prijsExcl: number | string | { toString(): string }, btwPct: number | string | { toString(): string }): number {
  const e = Number(prijsExcl.toString())
  const b = Number(btwPct.toString())
  return Math.round(e * (1 + b / 100) * 100)
}

// Parse "4,60" / "4.60" / "€ 4,60" → 4.6 (of null)
export function parseBedrag(s: string): number | null {
  const t = s.replace(/[€\s]/g, '').replace(',', '.')
  if (t === '' || t === '-' || t === '.') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
