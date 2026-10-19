'use client'
// Printertalen voor printers zonder Epson ePOS:
//  - ESC/POS (Epson-tickets via TCP 9100, o.a. TM-m30)
//  - ZPL (labelprinters zoals Metapace L-42D, 203 dpi = 8 dots/mm)
// Dezelfde "lijnen" uit print.ts (ticket- en stickerontwerp) worden hier omgezet.
import type { Lijn } from './print'
import { logoBits } from './print'

// Printers kennen geen “slimme” tekens of accenten in de standaardcodepagina → vereenvoudigen
const eenvoudig = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—·•]/g, '-').replace(/€/g, 'EUR')
const plat = (s: string) => eenvoudig(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '?')

// ─── ESC/POS ────────────────────────────────────────────────────────────────
export async function escposBytes(lijnen: Lijn[], opties: { cpl: number; dots: number; snijden: boolean }) {
  const uit: number[] = []
  const zet = (...b: number[]) => uit.push(...b)
  const tekst = (s: string) => { for (const c of plat(s)) uit.push(c.charCodeAt(0)); uit.push(0x0a) }
  zet(0x1b, 0x40) // initialiseren
  for (const l of lijnen) {
    if (l.soort === 'logo') {
      const r = await logoBits(Math.round(opties.dots * 0.45))
      const bw = r.w / 8
      zet(0x1b, 0x61, 1, 0x1d, 0x76, 0x30, 0, bw & 0xff, bw >> 8, r.h & 0xff, r.h >> 8)
      r.bytes.forEach(b => uit.push(b))
      zet(0x0a)
    } else if (l.soort === 'streep') {
      zet(0x1b, 0x61, 0, 0x1d, 0x21, 0x00, 0x1b, 0x45, 0); tekst('-'.repeat(opties.cpl))
    } else if (l.soort === 'wit') {
      zet(0x0a)
    } else {
      const breedte = l.groot ? Math.floor(opties.cpl / 2) : opties.cpl
      let t = plat(l.t)
      if (l.rechts) { const r = plat(l.rechts); t = t.slice(0, Math.max(0, breedte - r.length - 1)).padEnd(breedte - r.length) + r }
      zet(0x1b, 0x61, l.align === 'center' ? 1 : l.align === 'right' ? 2 : 0, 0x1d, 0x21, l.groot ? 0x11 : 0x00, 0x1b, 0x45, l.vet ? 1 : 0)
      tekst(t)
    }
  }
  zet(0x1d, 0x21, 0x00, 0x1b, 0x45, 0, 0x1b, 0x61, 0)
  if (opties.snijden) zet(0x1b, 0x64, 3, 0x1d, 0x56, 0x42, 0x00) // invoeren + snijden
  else zet(0x1b, 0x64, 2)
  return new Uint8Array(uit)
}

// ─── ZPL ────────────────────────────────────────────────────────────────────
// ZPL met ^CI28 = UTF-8: accenten blijven behouden
const zplTekst = (s: string) => eenvoudig(s).replace(/[\^~\\]/g, ' ')

export async function zplLabel(lijnen: Lijn[], o: { breedteMm: number; hoogteMm: number; rond: boolean }) {
  const W = Math.round(o.breedteMm * 8)
  const H = Math.round((o.rond ? o.breedteMm : o.hoogteMm) * 8)
  const marge = o.rond ? Math.round(W * 0.13) : 16
  const veld = W - 2 * marge
  const klein = o.rond ? 22 : 26, groot = o.rond ? 32 : 40
  // Hoogte van elk blok vooraf berekenen (rond label: verticaal centreren)
  type Blok = { h: number; zpl: (y: number) => Promise<string> | string }
  const blokken: Blok[] = []
  for (const l of lijnen) {
    if (l.soort === 'logo') {
      const r = await logoBits(Math.round(veld * (o.rond ? 0.5 : 0.35)))
      const hex = Array.from(r.bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
      const x = Math.round((W - r.w) / 2)
      blokken.push({ h: r.h + 6, zpl: y => `^FO${x},${y}^GFA,${r.bytes.length},${r.bytes.length},${r.w / 8},${hex}^FS` })
    } else if (l.soort === 'streep') {
      blokken.push({ h: 8, zpl: y => `^FO${marge},${y + 2}^GB${veld},2,2^FS` })
    } else if (l.soort === 'wit') {
      blokken.push({ h: 10, zpl: () => '' })
    } else {
      const h = l.groot ? groot : klein
      const t = zplTekst(l.rechts ? `${l.t}  ${l.rechts}` : l.t)
      const perRegel = Math.max(6, Math.floor(veld / (h * 0.5)))
      const regels = Math.min(2, Math.ceil(t.length / perRegel) || 1)
      const just = l.align === 'center' ? 'C' : l.align === 'right' ? 'R' : 'L'
      const vet = l.vet ? `^A0N,${h},${Math.round(h * 1.05)}` : `^A0N,${h},${h}`
      blokken.push({ h: regels * (h + 4), zpl: y => `^FO${marge},${y}${vet}^FB${veld},${regels},4,${just},0^FD${t}^FS` })
    }
  }
  const totaal = blokken.reduce((s, b) => s + b.h, 0)
  let y = o.rond ? Math.max(Math.round(marge * 0.6), Math.round((H - totaal) / 2)) : 12
  let zpl = `^XA^CI28^PW${W}^LL${H}^LH0,0`
  for (const b of blokken) { zpl += await b.zpl(y); y += b.h }
  return zpl + '^PQ1^XZ'
}
