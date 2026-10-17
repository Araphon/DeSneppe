import crypto from 'crypto'
import type { Campagne, Klant, Prisma } from '@prisma/client'
import { prisma } from './db'
import { stuurMail } from './mail'
import { stuurPushAanKlant } from './push'
import { getInstellingen } from './instellingen'
import { SITE } from './site'
import { datumPlus, lokaleDelen, vandaagLokaal } from './tijd'

// ─── Onderwerpen ────────────────────────────────────────

export const STANDAARD_ONDERWERPEN = [
  { sleutel: 'bestelstatus', naam: 'Status van mijn bestelling', omschrijving: 'Wanneer we bezig zijn en wanneer je bestelling klaar is', systeem: true, standaardAan: true },
  { sleutel: 'acties', naam: 'Acties & kortingen', omschrijving: 'Tijdelijke acties en voordelen', systeem: false, standaardAan: true },
  { sleutel: 'nieuw', naam: 'Nieuwe producten', omschrijving: 'Als er een nieuw broodje of gerecht op de kaart komt', systeem: false, standaardAan: true },
  { sleutel: 'weekbroodje', naam: 'Broodje van de week', omschrijving: 'Elke week ons broodje in de kijker', systeem: false, standaardAan: false },
  { sleutel: 'verjaardag', naam: 'Verjaardagsverrassing', omschrijving: 'Een attentie op je verjaardag', systeem: false, standaardAan: true },
  { sleutel: 'spaarpunten', naam: 'Spaarpunten', omschrijving: 'Als je een beloning kan verzilveren', systeem: false, standaardAan: true },
  { sleutel: 'herinnering', naam: 'Herinneringen', omschrijving: 'Bijvoorbeeld als je al een tijdje niet meer besteld hebt', systeem: false, standaardAan: true },
  { sleutel: 'review', naam: 'Vraag om je mening', omschrijving: 'Eén keer na een bestelling, om een review te geven', systeem: false, standaardAan: true },
  { sleutel: 'nieuws', naam: 'Nieuws', omschrijving: 'Vakantiesluitingen en ander nieuws van De Sneppe', systeem: false, standaardAan: true },
]

const STANDAARD_AUTOMATISATIES: { sleutel: string; naam: string; onderwerp: string; trigger: object; minDagen: number; regel: string; titel: string; tekst: string; knopTekst?: string; knopUrl?: string; push?: string }[] = [
  { sleutel: 'welkom', naam: 'Welkom na registratie', onderwerp: 'nieuws', trigger: { soort: 'NIEUWE_KLANT', dagen: 0 }, minDagen: 0, regel: 'Welkom bij De Sneppe, {voornaam}!', titel: 'Welkom, {voornaam}! 🥪', tekst: 'Fijn dat je er bent. Bij elke online bestelling spaar je punten voor lekkere beloningen.\n\nBestel je volgende broodje online en schuif meteen aan bij de kassa.', knopTekst: 'Bestel nu', knopUrl: '{site}/bestellen' },
  { sleutel: 'verjaardag', naam: 'Verjaardag', onderwerp: 'verjaardag', trigger: { soort: 'VERJAARDAG' }, minDagen: 300, regel: 'Gelukkige verjaardag, {voornaam}! 🎉', titel: 'Gelukkige verjaardag, {voornaam}!', tekst: 'Het hele team van De Sneppe wenst je een fantastische dag.\n\nKom gerust eens langs — we hebben iets lekkers voor je klaar.', knopTekst: 'Bekijk het menu', knopUrl: '{site}/menu', push: 'Gelukkige verjaardag, {voornaam}! 🎉' },
  { sleutel: 'missen', naam: 'We missen je', onderwerp: 'herinnering', trigger: { soort: 'INACTIEF', dagen: 60 }, minDagen: 90, regel: 'We missen je, {voornaam}!', titel: 'Het is alweer even geleden…', tekst: 'Je laatste bestelling bij De Sneppe is al een tijdje geleden. We hebben ondertussen niet stilgezeten!\n\nZin in een vers broodje? Bestel online en haal af wanneer het jou past.', knopTekst: 'Bestel opnieuw', knopUrl: '{site}/bestellen', push: 'We missen je! Zin in een vers broodje?' },
  { sleutel: 'review', naam: 'Reviewverzoek na afhalen', onderwerp: 'review', trigger: { soort: 'NA_AFHALEN', uren: 3 }, minDagen: 180, regel: 'Hoe was je bestelling, {voornaam}?', titel: 'Smaakte het?', tekst: 'Bedankt voor je bestelling bij De Sneppe! Zou je ons willen helpen met een korte review op Google? Het duurt maar een halve minuut en helpt ons enorm.', knopTekst: '⭐ Geef een review', knopUrl: '{reviewLink}' },
]

export async function zorgVoorStandaard() {
  for (const [i, o] of STANDAARD_ONDERWERPEN.entries()) {
    await prisma.meldingOnderwerp.upsert({ where: { sleutel: o.sleutel }, create: { ...o, volgorde: i }, update: {} })
  }
  for (const a of STANDAARD_AUTOMATISATIES) {
    if (await prisma.campagne.findUnique({ where: { systeemSleutel: a.sleutel } })) continue
    const ond = await prisma.meldingOnderwerp.findUnique({ where: { sleutel: a.onderwerp } })
    if (!ond) continue
    await prisma.campagne.create({ data: {
      naam: a.naam, type: 'AUTOMATISCH', status: 'GEPAUZEERD', onderwerpId: ond.id, systeemSleutel: a.sleutel,
      onderwerpRegel: a.regel, titel: a.titel, tekst: a.tekst, knopTekst: a.knopTekst, knopUrl: a.knopUrl, pushTekst: a.push,
      viaMail: true, viaPush: Boolean(a.push), trigger: a.trigger, minDagenTussen: a.minDagen,
    } })
  }
}

// Voorkeur van een klant voor een onderwerp (geen rij = systeemonderwerp aan, rest uit)
export async function voorkeur(klantId: string, sleutel: string): Promise<{ mail: boolean; push: boolean }> {
  const o = await prisma.meldingOnderwerp.findUnique({ where: { sleutel }, include: { voorkeuren: { where: { klantId } } } })
  if (!o || !o.actief) return { mail: false, push: false }
  const v = o.voorkeuren[0]
  return v ? { mail: v.mail, push: v.push } : { mail: o.systeem, push: o.systeem }
}

// Bij registratie: marketingtoestemming → standaardonderwerpen aan
export async function standaardVoorkeuren(klantId: string, marketing: boolean) {
  await zorgVoorStandaard()
  if (!marketing) return
  const ond = await prisma.meldingOnderwerp.findMany({ where: { standaardAan: true, systeem: false, actief: true } })
  await prisma.klantVoorkeur.createMany({ data: ond.map(o => ({ klantId, onderwerpId: o.id, mail: true, push: true })), skipDuplicates: true })
}

// ─── Klantgroepen ───────────────────────────────────────

export type GroepFilters = {
  gemeenten?: string[]
  postcodes?: string[]
  laatsteBestellingMinDagen?: number | null // langer dan X dagen geleden
  laatsteBestellingMaxDagen?: number | null // minder dan X dagen geleden
  nooitBesteld?: boolean
  bestellingenMin?: number | null
  bestellingenMax?: number | null
  puntenMin?: number | null
  verjaardagDezeMaand?: boolean
  geregistreerdBinnenDagen?: number | null
  productIds?: string[]
  categorieIds?: string[]
}

export async function klantenInGroep(f: GroepFilters): Promise<Klant[]> {
  const where: Prisma.KlantWhereInput = { geblokkeerd: false }
  if (f.gemeenten?.length) where.gemeente = { in: f.gemeenten, mode: 'insensitive' }
  if (f.postcodes?.length) where.postcode = { in: f.postcodes }
  if (f.puntenMin) where.punten = { gte: f.puntenMin }
  if (f.geregistreerdBinnenDagen) where.aangemaaktOp = { gte: new Date(Date.now() - f.geregistreerdBinnenDagen * 86400000) }
  let klanten = await prisma.klant.findMany({ where })
  if (!klanten.length) return []

  const nodigBestellingen = f.laatsteBestellingMinDagen || f.laatsteBestellingMaxDagen || f.nooitBesteld || f.bestellingenMin || f.bestellingenMax
  if (nodigBestellingen) {
    const stats = await prisma.bestelling.groupBy({ by: ['klantId'], where: { klantId: { in: klanten.map(k => k.id) }, status: { notIn: ['GEANNULEERD', 'NIET_AFGEHAALD'] } }, _count: true, _max: { afhaalTijd: true } })
    const m = new Map(stats.map(s => [s.klantId!, s]))
    const nu = Date.now()
    klanten = klanten.filter(k => {
      const s = m.get(k.id)
      const n = s?._count ?? 0
      const dagen = s?._max.afhaalTijd ? (nu - s._max.afhaalTijd.getTime()) / 86400000 : Infinity
      if (f.nooitBesteld && n > 0) return false
      if (f.bestellingenMin && n < f.bestellingenMin) return false
      if (f.bestellingenMax != null && f.bestellingenMax !== undefined && f.bestellingenMax !== null && n > f.bestellingenMax) return false
      if (f.laatsteBestellingMinDagen && (n === 0 || dagen < f.laatsteBestellingMinDagen)) return false
      if (f.laatsteBestellingMaxDagen && dagen > f.laatsteBestellingMaxDagen) return false
      return true
    })
  }
  if (f.verjaardagDezeMaand) {
    const maand = Number(vandaagLokaal().slice(5, 7))
    klanten = klanten.filter(k => k.geboortedatum && k.geboortedatum.getUTCMonth() + 1 === maand)
  }
  if (f.productIds?.length || f.categorieIds?.length) {
    const productIds = new Set(f.productIds || [])
    if (f.categorieIds?.length) (await prisma.product.findMany({ where: { categorieId: { in: f.categorieIds } }, select: { id: true } })).forEach(p => productIds.add(p.id))
    const rows = await prisma.bestellingRegel.findMany({ where: { productId: { in: Array.from(productIds) }, bestelling: { klantId: { in: klanten.map(k => k.id) }, status: { not: 'GEANNULEERD' } } }, select: { bestelling: { select: { klantId: true } } } })
    const ids = new Set(rows.map(r => r.bestelling.klantId))
    klanten = klanten.filter(k => ids.has(k.id))
  }
  return klanten
}

// ─── Verzenden ──────────────────────────────────────────

const secret = () => process.env.AUTH_SECRET || 'dev'
export function afmeldToken(klantId: string, onderwerpId: string) {
  const sig = crypto.createHmac('sha256', secret()).update(`${klantId}.${onderwerpId}`).digest('base64url').slice(0, 22)
  return Buffer.from(`${klantId}.${onderwerpId}.${sig}`).toString('base64url')
}
export function leesAfmeldToken(t: string): { klantId: string; onderwerpId: string } | null {
  try {
    const [klantId, onderwerpId, sig] = Buffer.from(t, 'base64url').toString().split('.')
    const juist = crypto.createHmac('sha256', secret()).update(`${klantId}.${onderwerpId}`).digest('base64url').slice(0, 22)
    return sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(juist)) ? { klantId, onderwerpId } : null
  } catch { return null }
}

async function reviewLink() {
  const { bedrijf } = await getInstellingen()
  const w = bedrijf.googlePlaceId.trim()
  if (/^https?:\/\//.test(w)) return w // volledige reviewlink uit Google Bedrijfsprofiel (bv. https://g.page/r/…/review)
  return w ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(w)}` : `https://www.google.com/search?q=${encodeURIComponent(`${bedrijf.naam} ${bedrijf.gemeente}`)}`
}

function vervang(s: string, k: Klant, extra: Record<string, string>) {
  return s
    .replace(/\{voornaam\}/g, k.voornaam).replace(/\{naam\}/g, k.naam)
    .replace(/\{punten\}/g, String(k.punten))
    .replace(/\{(\w+)\}/g, (m, key) => extra[key] ?? m)
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export type Resultaat = { verzonden: number; mislukt: number; nietVerzonden: number; overgeslagen: number }

export async function verstuurAanKlanten(c: Campagne, klanten: Klant[], opties: { sleutel?: (k: Klant) => string; test?: boolean } = {}): Promise<Resultaat> {
  const res: Resultaat = { verzonden: 0, mislukt: 0, nietVerzonden: 0, overgeslagen: 0 }
  const extraBasis = { site: SITE, reviewLink: await reviewLink() }
  const beloning = c.cadeauBeloningId ? await prisma.loyaltyBeloning.findUnique({ where: { id: c.cadeauBeloningId } }) : null
  const ond = await prisma.meldingOnderwerp.findUnique({ where: { id: c.onderwerpId } })
  for (const k of klanten) {
    const sleutel = opties.sleutel?.(k) ?? null
    if (!opties.test) {
      // dedupe: zelfde sleutel al verstuurd, of te kort geleden
      if (sleutel && await prisma.verzending.findFirst({ where: { campagneId: c.id, klantId: k.id, sleutel } })) { res.overgeslagen++; continue }
      if (c.minDagenTussen > 0 && await prisma.verzending.findFirst({ where: { campagneId: c.id, klantId: k.id, status: 'VERZONDEN', verzondenOp: { gte: new Date(Date.now() - c.minDagenTussen * 86400000) } } })) { res.overgeslagen++; continue }
    }
    const vk = opties.test ? { mail: true, push: false } : await voorkeur(k.id, ond?.sleutel || '')
    const extra: Record<string, string> = { ...extraBasis }
    if (beloning && !opties.test) {
      const code = 'SN-' + crypto.randomBytes(5).toString('hex').toUpperCase()
      await prisma.voucher.create({ data: { code, klantId: k.id, beloningId: beloning.id, punten: 0 } })
      extra.cadeau = beloning.naam; extra.vouchercode = code
    } else if (beloning) { extra.cadeau = beloning.naam; extra.vouchercode = 'SN-TEST123' }

    if (c.viaMail && vk.mail) {
      const alineas = vervang(c.tekst, k, extra).split(/\n\s*\n/).map(p => esc(p).replace(/\n/g, '<br>'))
      if (beloning) alineas.push(`🎁 <strong>Cadeau: ${esc(beloning.naam)}</strong> — toon je voucher in je account (Spaarpunten) aan de kassa.`)
      if (c.afbeelding) alineas.unshift(`<img src="${SITE}${c.afbeelding}" alt="" width="504" style="width:100%;max-width:504px;border-radius:12px;display:block">`)
      const afmeld = `${SITE}/afmelden?t=${afmeldToken(k.id, c.onderwerpId)}`
      const knop = c.knopTekst && c.knopUrl ? { tekst: vervang(c.knopTekst, k, extra), url: vervang(c.knopUrl, k, extra) } : undefined
      const ok = await stuurMail(k.email, vervang(c.onderwerpRegel, k, extra), vervang(c.titel, k, extra), alineas, knop, { afmeldUrl: afmeld, afmeldTekst: ond ? `Geen mails meer over “${ond.naam}”` : undefined })
      if (!opties.test) await prisma.verzending.create({ data: { campagneId: c.id, klantId: k.id, kanaal: 'MAIL', status: ok ? 'VERZONDEN' : process.env.SMTP_HOST ? 'MISLUKT' : 'NIET_VERZONDEN', reden: ok ? null : process.env.SMTP_HOST ? 'Mailserver gaf een fout' : 'E-mail nog niet ingesteld', sleutel } })
      if (ok) res.verzonden++; else if (process.env.SMTP_HOST) res.mislukt++; else res.nietVerzonden++
    }
    if (c.viaPush && vk.push && !opties.test) {
      const n = await stuurPushAanKlant(k.id, { titel: 'De Sneppe', tekst: vervang(c.pushTekst || c.titel, k, extra), url: c.knopUrl ? vervang(c.knopUrl, k, extra) : `${SITE}/` })
      await prisma.verzending.create({ data: { campagneId: c.id, klantId: k.id, kanaal: 'PUSH', status: n ? 'VERZONDEN' : 'NIET_VERZONDEN', reden: n ? null : 'Geen app met meldingen op dit account', sleutel } })
      if (n) res.verzonden++; else res.nietVerzonden++
    }
    if (!(c.viaMail && vk.mail) && !(c.viaPush && vk.push)) res.overgeslagen++
  }
  if (!opties.test) await prisma.campagne.update({ where: { id: c.id }, data: { laatstVerzonden: new Date() } })
  return res
}

export async function ontvangersVan(c: Campagne): Promise<Klant[]> {
  const groep = c.klantgroepId ? await prisma.klantgroep.findUnique({ where: { id: c.klantgroepId } }) : null
  const klanten = await klantenInGroep((groep?.filters as GroepFilters) || {})
  const ond = await prisma.meldingOnderwerp.findUnique({ where: { id: c.onderwerpId } })
  if (!ond) return []
  const vk = await prisma.klantVoorkeur.findMany({ where: { onderwerpId: ond.id, klantId: { in: klanten.map(k => k.id) } } })
  const m = new Map(vk.map(v => [v.klantId, v]))
  return klanten.filter(k => {
    const v = m.get(k.id)
    const mail = v ? v.mail : ond.systeem, push = v ? v.push : ond.systeem
    return (c.viaMail && mail) || (c.viaPush && push)
  })
}

// ─── Planner (wordt elke 5 minuten aangeroepen) ─────────

function volgende(d: Date, herhaling: string) {
  const n = new Date(d)
  if (herhaling === 'WEKELIJKS') n.setUTCDate(n.getUTCDate() + 7)
  else if (herhaling === 'MAANDELIJKS') n.setUTCMonth(n.getUTCMonth() + 1)
  return n
}

export async function draaiPlanner() {
  await zorgVoorStandaard()
  const log: string[] = []
  const nu = new Date()

  // 1. Geplande (eenmalige of terugkerende) campagnes
  const gepland = await prisma.campagne.findMany({ where: { type: 'EENMALIG', status: 'GEPLAND', geplandOp: { lte: nu } } })
  for (const c of gepland) {
    const r = await verstuurAanKlanten(c, await ontvangersVan(c))
    if (c.herhaling !== 'GEEN' && c.geplandOp) {
      let n = volgende(c.geplandOp, c.herhaling)
      while (n <= nu) n = volgende(n, c.herhaling)
      await prisma.campagne.update({ where: { id: c.id }, data: { geplandOp: n } })
    } else await prisma.campagne.update({ where: { id: c.id }, data: { status: 'VERZONDEN' } })
    log.push(`${c.naam}: ${r.verzonden} verzonden, ${r.nietVerzonden} niet verzonden`)
  }

  // 2. Automatisaties
  const auto = await prisma.campagne.findMany({ where: { type: 'AUTOMATISCH', status: 'ACTIEF' } })
  const l = lokaleDelen(nu)
  for (const c of auto) {
    const t = (c.trigger || {}) as { soort?: string; dagen?: number; uren?: number }
    const kandidaten = await ontvangersVan(c)
    if (!kandidaten.length) continue
    let doel: Klant[] = [], sleutel: (k: Klant) => string = () => ''
    if (t.soort === 'VERJAARDAG') {
      if (l.uur < 9) continue // niet midden in de nacht
      const md = l.datum.slice(5)
      doel = kandidaten.filter(k => k.geboortedatum && k.geboortedatum.toISOString().slice(5, 10) === md)
      sleutel = () => l.datum.slice(0, 4)
    } else if (t.soort === 'NIEUWE_KLANT') {
      const dagen = t.dagen || 0
      const grens = Date.now() - dagen * 86400000
      doel = kandidaten.filter(k => k.aangemaaktOp.getTime() <= grens && k.aangemaaktOp.getTime() >= grens - 3 * 86400000)
      sleutel = () => 'welkom'
    } else if (t.soort === 'INACTIEF') {
      if (l.uur < 10 || l.uur > 18) continue
      const dagen = t.dagen || 60
      const stats = await prisma.bestelling.groupBy({ by: ['klantId'], where: { klantId: { in: kandidaten.map(k => k.id) }, status: { notIn: ['GEANNULEERD', 'NIET_AFGEHAALD'] } }, _max: { afhaalTijd: true } })
      const m = new Map(stats.map(s => [s.klantId!, s._max.afhaalTijd]))
      doel = kandidaten.filter(k => { const d = m.get(k.id); return d && Date.now() - d.getTime() >= dagen * 86400000 })
      sleutel = k => `na-${m.get(k.id)?.toISOString().slice(0, 10)}`
    } else if (t.soort === 'NA_AFHALEN') {
      const uren = t.uren ?? 3
      const tot = new Date(Date.now() - uren * 3600000), van = new Date(tot.getTime() - 48 * 3600000)
      const best = await prisma.bestelling.findMany({ where: { status: { in: ['AFGEHAALD', 'KLAAR'] }, statusGewijzigdOp: { gte: van, lte: tot }, klantId: { in: kandidaten.map(k => k.id) } }, select: { id: true, klantId: true }, orderBy: { statusGewijzigdOp: 'desc' } })
      const perKlant = new Map<string, string>()
      best.forEach(b => { if (b.klantId && !perKlant.has(b.klantId)) perKlant.set(b.klantId, b.id) })
      doel = kandidaten.filter(k => perKlant.has(k.id))
      sleutel = k => perKlant.get(k.id)!
    }
    if (!doel.length) continue
    const r = await verstuurAanKlanten(c, doel.slice(0, 200), { sleutel })
    if (r.verzonden || r.nietVerzonden) log.push(`${c.naam}: ${r.verzonden} verzonden, ${r.nietVerzonden} niet verzonden`)
  }
  return log
}

export { datumPlus }
