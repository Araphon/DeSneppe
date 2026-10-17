'use client'
// Printen via Epson ePOS-Print (XML over HTTP) — werkt rechtstreeks vanuit Safari op de iPad
// naar Epson TM-printers met ePOS (bv. TM-m30, TM-T88VI/VII, TM-L100 labelprinter).
// Omdat de site via https draait, moet de printer ook via https bereikbaar zijn
// (open één keer https://<printer-ip> op de iPad en aanvaard het certificaat).
//
// Ticket en sticker worden opgebouwd als een lijst "regels" op basis van het ontwerp
// (Admin → Ticket & sticker). Dezelfde regels voeden het live voorbeeld én de printer.

import type { StickerOntwerp, TicketOntwerp } from '@/lib/instellingen'

export type PrintRegel = { productNaam: string; aantal: number; totaalCent?: number; leeftijdsgrens?: number | null; keuzes: { optie: string; keuze: string }[]; aanpassingen: { naam: string }[]; stickerPrinten: boolean }
export type PrintBestelling = { nummer: number; klantNaam: string; klantTelefoon?: string | null; aangemaaktOp: string; afhaalTijd: string; slotMinuten?: number; totaalCent: number; opmerking: string | null; regels: PrintRegel[]; betaalStatus?: string; transactiekostCent?: number; kostLabel?: string | null }
export type PrinterConfig = { ticketIp: string; ticketType: string; stickerIp: string; stickerType: string; stickerBreedteMm: number }
export type Ontwerpen = { ticket: TicketOntwerp; sticker: StickerOntwerp }

export type Lijn =
  | { soort: 'tekst'; t: string; groot?: boolean; vet?: boolean; align?: 'left' | 'center' | 'right'; rechts?: string }
  | { soort: 'streep' }
  | { soort: 'logo' }
  | { soort: 'wit' }

const tijd = (iso: string) => new Intl.DateTimeFormat('nl-BE', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const datum = (iso: string) => new Intl.DateTimeFormat('nl-BE', { timeZone: 'Europe/Brussels', weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(iso))
// Afhaalslot als "16:00-16:15"
export const slot = (iso: string, min = 15) => `${tijd(iso)}-${tijd(new Date(new Date(iso).getTime() + min * 60000).toISOString())}`
const euro = (c: number) => '€ ' + (c / 100).toFixed(2).replace('.', ',')

// Aantal tekens per regel (font A) per papierbreedte
export function tekensPerRegel(mm: number) { return mm >= 76 ? 48 : mm >= 56 ? 32 : Math.max(16, Math.round(mm * 0.55)) }
function dots(mm: number) { return mm >= 76 ? 576 : mm >= 56 ? 384 : Math.round(mm * 8) }

export function ticketLijnen(b: PrintBestelling, o: TicketOntwerp): Lijn[] {
  const l: Lijn[] = []
  if (o.logo) l.push({ soort: 'logo' })
  o.koptekst.split('\n').filter(x => x.trim()).forEach((r, i) => l.push({ soort: 'tekst', t: r, groot: i === 0, vet: i === 0, align: 'center' }))
  l.push({ soort: 'wit' })
  l.push({ soort: 'tekst', t: `${o.toonNummer ? `#${b.nummer}  ` : ''}${b.klantNaam}`, groot: o.klantGroot, vet: true })
  if (o.toonTelefoon && b.klantTelefoon) l.push({ soort: 'tekst', t: `Tel: ${b.klantTelefoon}` })
  if (o.toonBesteltijd) l.push({ soort: 'tekst', t: `Besteld: ${datum(b.aangemaaktOp)} ${tijd(b.aangemaaktOp)}` })
  l.push({ soort: 'tekst', t: `AFHALEN: ${datum(b.afhaalTijd)}`, vet: true })
  l.push({ soort: 'tekst', t: slot(b.afhaalTijd, b.slotMinuten), vet: true, groot: o.klantGroot })
  l.push({ soort: 'streep' })
  for (const r of b.regels) {
    l.push({ soort: 'tekst', t: `${r.aantal} x ${r.productNaam}`, vet: true, groot: o.productGroot, rechts: o.toonPrijzen && r.totaalCent !== undefined ? euro(r.totaalCent) : undefined })
    for (const k of r.keuzes) l.push({ soort: 'tekst', t: `   ${k.keuze}` })
    for (const a of r.aanpassingen) l.push({ soort: 'tekst', t: `   * ${a.naam}` })
  }
  l.push({ soort: 'streep' })
  const lg = Math.max(0, ...b.regels.map(r => r.leeftijdsgrens || 0))
  if (lg) { l.push({ soort: 'tekst', t: `*** ${lg}+ : LEEFTIJD CONTROLEREN ***`, vet: true, align: 'center' }); l.push({ soort: 'streep' }) }
  if (o.toonOpmerking && b.opmerking) { l.push({ soort: 'tekst', t: 'OPMERKING:', vet: true }); l.push({ soort: 'tekst', t: b.opmerking }); l.push({ soort: 'streep' }) }
  if (o.toonTotaal && b.transactiekostCent) l.push({ soort: 'tekst', t: b.kostLabel || 'Servicekost', rechts: euro(b.transactiekostCent) })
  if (o.toonTotaal) l.push({ soort: 'tekst', t: `TOTAAL ${euro(b.totaalCent)}`, vet: true, groot: true, align: 'right' })
  if (o.toonBetaalstatus) l.push(b.betaalStatus === 'BETAALD' ? { soort: 'tekst', t: '*** BETAALD (online) ***', vet: true, groot: true, align: 'center' } : { soort: 'tekst', t: 'Te betalen aan de kassa', vet: true, align: 'center' })
  o.voettekst.split('\n').filter(x => x.trim()).forEach(r => l.push({ soort: 'tekst', t: r, align: 'center' }))
  return l
}

export type Sticker = { klant: string; product: string; regels: string[]; nummer: number; tijd: string; volg: string }

export function stickers(b: PrintBestelling): Sticker[] {
  const lijst: Sticker[] = []
  const totaal = b.regels.filter(r => r.stickerPrinten).reduce((s, r) => s + r.aantal, 0)
  let n = 0
  for (const r of b.regels) {
    if (!r.stickerPrinten) continue
    for (let i = 0; i < r.aantal; i++) {
      n++
      lijst.push({ klant: b.klantNaam, product: r.productNaam, regels: [...r.keuzes.map(k => `k:${k.keuze}`), ...r.aanpassingen.map(a => `a:${a.naam}`)], nummer: b.nummer, tijd: slot(b.afhaalTijd, b.slotMinuten), volg: `${n}/${totaal}` })
    }
  }
  return lijst
}

export function stickerLijnen(s: Sticker, o: StickerOntwerp): Lijn[] {
  const l: Lijn[] = []
  const c = o.rond ? ('center' as const) : undefined
  if (o.logo) l.push({ soort: 'logo' })
  l.push({ soort: 'tekst', t: s.klant, groot: o.klantGroot, vet: true, align: c })
  l.push({ soort: 'tekst', t: s.product, groot: o.productGroot, vet: true, align: c })
  for (const r of s.regels) {
    if (r.startsWith('k:') && o.toonKeuzes) l.push({ soort: 'tekst', t: r.slice(2), align: c })
    if (r.startsWith('a:') && o.toonAanpassingen) l.push({ soort: 'tekst', t: r.slice(2), align: c })
  }
  const voet = [o.toonNummer ? `#${s.nummer}` : '', o.toonAfhaaltijd ? s.tijd : '', o.toonVolgnummer ? s.volg : ''].filter(Boolean).join(' · ')
  if (voet) l.push({ soort: 'tekst', t: voet, align: c })
  o.voettekst.split('\n').filter(x => x.trim()).forEach(r => l.push({ soort: 'tekst', t: r, align: c }))
  return l
}

// ─── Logo als 1-bit rasterbeeld (voor ePOS <image>) ─────────────────────────
const logoCache = new Map<number, { b64: string; w: number; h: number }>()
async function logoRaster(breedte: number) {
  if (logoCache.has(breedte)) return logoCache.get(breedte)!
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new window.Image(); i.onload = () => res(i); i.onerror = rej; i.src = '/logo.png' })
  const w = Math.floor(breedte / 8) * 8
  const h = Math.round((img.height / img.width) * w)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  const bytes = new Uint8Array((w / 8) * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    if ((d[i] + d[i + 1] + d[i + 2]) / 3 < 128) bytes[y * (w / 8) + (x >> 3)] |= 0x80 >> (x & 7)
  }
  let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b) })
  const r = { b64: btoa(bin), w, h }
  logoCache.set(breedte, r)
  return r
}

// ─── ePOS-XML ───────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!))
// Epson-fonts kennen geen “slimme” tekens → vereenvoudigen
const plat = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/€/g, 'EUR')

async function lijnenNaarXml(lijnen: Lijn[], papierMm: number, opties: { snijden: boolean }) {
  const cpl = tekensPerRegel(papierMm)
  let x = '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">'
  for (const l of lijnen) {
    if (l.soort === 'logo') {
      const r = await logoRaster(Math.round(dots(papierMm) * 0.45))
      x += `<text align="center"/><image width="${r.w}" height="${r.h}" color="color_1" mode="mono">${r.b64}</image><feed line="1"/>`
    } else if (l.soort === 'streep') {
      x += `<text align="left"/><text width="1" height="1" em="false"/><text>${'-'.repeat(cpl)}&#10;</text>`
    } else if (l.soort === 'wit') {
      x += '<feed line="1"/>'
    } else {
      const breedte = l.groot ? Math.floor(cpl / 2) : cpl
      let t = plat(l.t)
      if (l.rechts) { const r = plat(l.rechts); t = t.slice(0, breedte - r.length - 1).padEnd(breedte - r.length) + r }
      x += `<text align="${l.align || 'left'}"/><text width="${l.groot ? 2 : 1}" height="${l.groot ? 2 : 1}" em="${l.vet ? 'true' : 'false'}"/><text>${esc(t)}&#10;</text>`
    }
  }
  x += opties.snijden ? '<feed line="3"/><cut type="feed"/>' : '<feed line="1"/><cut type="feed"/>'
  return x + '</epos-print>'
}

async function stuurEpos(ip: string, xml: string) {
  const proto = /^https?:\/\//.test(ip) ? '' : 'https://'
  const url = `${proto}${ip.replace(/\/$/, '')}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`
  const env = `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>${xml}</s:Body></s:Envelope>`
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', 'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT', SOAPAction: '""' }, body: env })
  const tekst = await r.text()
  if (!/success="true"/.test(tekst)) throw new Error('Printer antwoordde met een fout')
}

// ─── HTML (voorbeeld + AirPrint-fallback) ───────────────────────────────────
const h = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
export function lijnenNaarHtml(lijnen: Lijn[]) {
  return lijnen.map(l => {
    if (l.soort === 'logo') return '<div style="text-align:center;margin:0 0 6px"><img src="/logo.png" alt="" style="display:block;margin:0 auto;width:40%;max-width:170px"></div>'
    if (l.soort === 'streep') return '<div style="border-top:1px dashed #000;margin:4px 0"></div>'
    if (l.soort === 'wit') return '<div style="height:10px"></div>'
    const st = `text-align:${l.align || 'left'};font-weight:${l.vet ? 700 : 400};font-size:${l.groot ? '2em' : '1em'};line-height:1.25;white-space:pre-wrap;display:flex;gap:8px`
    return `<div style="${st}"><span style="flex:1;text-align:${l.align || 'left'}">${h(l.t)}</span>${l.rechts ? `<span>${h(l.rechts)}</span>` : ''}</div>`
  }).join('')
}

function printViaBrowser(stukken: string[], breedteMm: number, hoogteMm?: number) {
  const w = window.open('', '_blank', 'width=400,height=600')
  if (!w) throw new Error('Pop-up geblokkeerd')
  w.document.write(`<!doctype html><html><head><title>Print</title><style>@page{size:${breedteMm}mm ${hoogteMm ? hoogteMm + 'mm' : 'auto'};margin:2mm}body{font-family:Arial,sans-serif;font-size:10pt;margin:0}.s{page-break-after:always}</style></head><body>${stukken.map(s => `<div class="s">${s}</div>`).join('')}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script></body></html>`)
  w.document.close()
}

export async function printBestelling(b: PrintBestelling, cfg: PrinterConfig, ontwerp: Ontwerpen, wat: { ticket?: boolean; stickers?: boolean } = { ticket: true, stickers: true }) {
  const fouten: string[] = []
  if (wat.ticket && cfg.ticketType === 'EPSON_EPOS') {
    if (!cfg.ticketIp) fouten.push('Geen IP-adres voor de ticketprinter ingesteld')
    else try {
      const xml = await lijnenNaarXml(ticketLijnen(b, ontwerp.ticket), ontwerp.ticket.papierMm, { snijden: true })
      for (let i = 0; i < Math.max(1, ontwerp.ticket.kopieen); i++) await stuurEpos(cfg.ticketIp, xml)
    } catch (e) { fouten.push(`Ticketprinter: ${(e as Error).message || 'niet bereikbaar'}`) }
  }
  const st = stickers(b)
  if (wat.stickers && st.length) {
    const so = ontwerp.sticker
    if (cfg.stickerType === 'EPSON_EPOS') {
      if (!cfg.stickerIp) fouten.push('Geen IP-adres voor de stickerprinter ingesteld')
      else for (const s of st) {
        try { await stuurEpos(cfg.stickerIp, await lijnenNaarXml(stickerLijnen(s, so), so.breedteMm, { snijden: false })) }
        catch (e) { fouten.push(`Stickerprinter: ${(e as Error).message || 'niet bereikbaar'}`); break }
      }
    } else if (cfg.stickerType === 'BROWSER') {
      printViaBrowser(st.map(s => lijnenNaarHtml(stickerLijnen(s, so))), so.breedteMm, so.rond ? so.breedteMm : so.hoogteMm)
    }
  }
  if (fouten.length) throw new Error(fouten.join(' · '))
}

// Voorbeeldbestelling voor het ontwerpscherm en testprints
export const VOORBEELD: PrintBestelling = {
  nummer: 12,
  klantNaam: 'Jan Peeters',
  klantTelefoon: '0470 12 34 56',
  aangemaaktOp: new Date(Date.now() - 25 * 60000).toISOString(),
  afhaalTijd: new Date(Math.ceil((Date.now() + 20 * 60000) / 900000) * 900000).toISOString(),
  slotMinuten: 15,
  totaalCent: 1440,
  opmerking: 'Graag extra servetten',
  regels: [
    { productNaam: 'Martino', aantal: 1, totaalCent: 560, keuzes: [], aanpassingen: [{ naam: 'Zonder ansjovis' }, { naam: 'Zonder augurk' }], stickerPrinten: true },
    { productNaam: 'Hesp', aantal: 1, totaalCent: 480, keuzes: [], aanpassingen: [{ naam: 'Zonder ei' }], stickerPrinten: true },
    { productNaam: 'Verse soep 500ml', aantal: 1, totaalCent: 400, keuzes: [{ optie: 'Warm/koud?', keuze: 'Koud meenemen' }], aanpassingen: [], stickerPrinten: false },
  ],
}
