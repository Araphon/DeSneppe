// Alle kloktijden worden in Europe/Brussels getoond en geïnterpreteerd.
export const TZ = 'Europe/Brussels'

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
})

export function lokaleDelen(d: Date) {
  const p: Record<string, string> = {}
  for (const x of partsFmt.formatToParts(d)) p[x.type] = x.value
  return {
    jaar: +p.year, maand: +p.month, dag: +p.day, uur: +p.hour, minuut: +p.minute,
    datum: `${p.year}-${p.month}-${p.day}`,
    tijd: `${p.hour}:${p.minute}`,
  }
}

function offsetMs(d: Date): number {
  const l = lokaleDelen(d)
  const asUtc = Date.UTC(l.jaar, l.maand - 1, l.dag, l.uur, l.minuut, d.getUTCSeconds())
  return asUtc - Math.floor(d.getTime() / 1000) * 1000
}

// "2026-10-20" + "11:15" (Brussel) → Date (UTC)
export function lokaalNaarUtc(datum: string, tijd = '00:00'): Date {
  const [y, m, d] = datum.split('-').map(Number)
  const [h, mi] = tijd.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, h, mi)
  let res = guess - offsetMs(new Date(guess))
  res = guess - offsetMs(new Date(res))
  return new Date(res)
}

export function vandaagLokaal(): string {
  return lokaleDelen(new Date()).datum
}

// Datum-rekenen op "YYYY-MM-DD" strings (kalenderdagen, tijdzone-onafhankelijk)
export function datumPlus(datum: string, dagen: number): string {
  const [y, m, d] = datum.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + dagen))
  return t.toISOString().slice(0, 10)
}

export function weekdag(datum: string): number {
  // 1 = maandag … 7 = zondag
  const [y, m, d] = datum.split('-').map(Number)
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return w === 0 ? 7 : w
}

export function dagenTussen(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

export function datumUitDb(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function datumNaarDb(datum: string): Date {
  return new Date(datum + 'T00:00:00.000Z')
}

export function minutenVanTijd(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function tijdVanMinuten(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
export const DAG_KORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
export function dagNaam(nr: number) { return DAGEN[nr - 1] }

export function formatDatumLang(datum: string): string {
  return new Intl.DateTimeFormat('nl-BE', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(datum + 'T12:00:00Z'))
}

export function formatTijd(d: Date): string {
  return lokaleDelen(d).tijd
}

export function formatDatumTijd(d: Date): string {
  return new Intl.DateTimeFormat('nl-BE', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}
