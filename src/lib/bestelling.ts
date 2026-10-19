import type { BestelStatus, BetaalStatus, Bestelling, Klant, Prisma } from '@prisma/client'
import { prisma } from './db'
import { getProductVoorBestelling } from './catalogus'
import { isSlotVrij } from './tijdslots'
import { lokaleDelen, datumNaarDb, formatTijd, formatDatumLang } from './tijd'
import { euro } from './geld'
import { stuurMail } from './mail'
import { SITE } from './site'
import { getInstellingen, transactiekost } from './instellingen'
import { nietBeschikbaarReden } from './beschikbaarheid'
import { aanKassaGeweigerd } from './misbruik'
import { voorkeur } from './marketing'
import { mollie } from './mollie'
import { stuurPushAanBeheerders, stuurPushAanKlant } from './push'

export type InRegel = { productId: string; aantal: number; keuzes: string[]; aanpassingen: string[] }

export class BestelFout extends Error {}

export type Betaalwijze = 'AAN_KASSA' | 'ONLINE'

export async function maakBestelling(klant: Klant, regels: InRegel[], afhaalIso: string, opmerking?: string, betaalwijze: Betaalwijze = 'AAN_KASSA') {
  if (!Array.isArray(regels) || !regels.length) throw new BestelFout('Je mandje is leeg.')
  if (regels.length > 60) throw new BestelFout('Te veel producten in één bestelling.')

  type RegelData = {
    productId: string; productNaam: string; aantal: number; eenheidCent: number; totaalCent: number
    btwPct: Prisma.Decimal; leeftijdsgrens: number | null; keuzes: { optie: string; keuze: string; prijsCent: number }[]
    aanpassingen: { naam: string; prijsCent: number }[]; stickerPrinten: boolean; punten: number
  }
  const regelData: RegelData[] = []
  for (const r of regels) {
    const aantal = Math.floor(Number(r.aantal))
    if (!(aantal >= 1 && aantal <= 99)) throw new BestelFout('Ongeldig aantal.')
    const prod = await getProductVoorBestelling(String(r.productId))
    if (!prod) throw new BestelFout('Een product in je mandje bestaat niet meer. Verwijder het en probeer opnieuw.')
    const { raw, menu } = prod
    if (menu.uitverkocht) throw new BestelFout(`${menu.naam} is helaas uitverkocht. Verwijder het uit je mandje.`)
    if (menu.maxPerBestelling && aantal > menu.maxPerBestelling) throw new BestelFout(`Maximaal ${menu.maxPerBestelling}× ${menu.naam} per bestelling.`)
    const al = lokaleDelen(new Date(afhaalIso))
    const reden = nietBeschikbaarReden(menu.beschikbaar, al.datum, al.tijd)
    if (reden) throw new BestelFout(`${menu.naam} is ${reden} beschikbaar en kan niet op dit afhaalmoment. Kies een ander moment of verwijder het.`)
    if (menu.leeftijdsgrens && klant.geboortedatum) {
      const g = klant.geboortedatum, nu = new Date()
      const leeftijd = nu.getUTCFullYear() - g.getUTCFullYear() - ((nu.getUTCMonth() < g.getUTCMonth() || (nu.getUTCMonth() === g.getUTCMonth() && nu.getUTCDate() < g.getUTCDate())) ? 1 : 0)
      if (leeftijd < menu.leeftijdsgrens) throw new BestelFout(`${menu.naam} verkopen we niet onder de ${menu.leeftijdsgrens} jaar. Verwijder het uit je mandje.`)
    }

    const gekozenIds = new Set((r.keuzes || []).map(String))
    const keuzes = []
    for (const o of menu.opties) {
      const k = o.keuzes.filter(k => gekozenIds.has(k.id))
      if (k.length > 1) throw new BestelFout(`Kies één optie voor “${o.naam}” bij ${menu.naam}.`)
      if (!k.length && o.verplicht) throw new BestelFout(`Kies “${o.naam}” bij ${menu.naam}.`)
      if (k[0]) keuzes.push({ optie: o.naam, keuze: k[0].naam, prijsCent: k[0].prijsCent })
    }
    const aanpIds = new Set((r.aanpassingen || []).map(String))
    const aanpassingen = menu.aanpassingen.filter(a => aanpIds.has(a.id)).map(a => ({ naam: a.naam, prijsCent: a.prijsCent }))
    if (aanpassingen.length !== aanpIds.size) throw new BestelFout(`De aanpassingen voor ${menu.naam} zijn gewijzigd. Voeg het product opnieuw toe.`)

    const eenheidCent = Math.max(0, menu.prijsCent + keuzes.reduce((s, k) => s + k.prijsCent, 0) + aanpassingen.reduce((s, a) => s + a.prijsCent, 0))
    regelData.push({
      productId: menu.id, productNaam: menu.naam, aantal, eenheidCent, totaalCent: eenheidCent * aantal,
      btwPct: raw.btwPct, leeftijdsgrens: raw.leeftijdsgrens, keuzes, aanpassingen, stickerPrinten: raw.stickerPrinten,
      punten: menu.loyaltyPunten,
    })
  }

  const afhaal = new Date(afhaalIso)
  if (!(await isSlotVrij(afhaalIso))) throw new BestelFout('Dit afhaalmoment is net volzet of niet meer beschikbaar. Kies een ander tijdstip.')

  const inst = await getInstellingen()
  if (betaalwijze === 'ONLINE' && !(inst.betalen.onlineActief && inst.betalen.mollieApiKey)) throw new BestelFout('Online betalen is momenteel niet mogelijk.')
  if (betaalwijze === 'AAN_KASSA' && !inst.betalen.aanKassaActief && inst.betalen.onlineActief && inst.betalen.mollieApiKey) throw new BestelFout('Betalen bij afhalen is niet mogelijk. Kies online betalen.')
  const subtotaalCent = regelData.reduce((s, r) => s + r.totaalCent, 0)
  if (betaalwijze === 'ONLINE' && inst.betalen.onlineVanafCent > 0 && subtotaalCent < inst.betalen.onlineVanafCent) throw new BestelFout(`Online betalen kan vanaf ${euro(inst.betalen.onlineVanafCent)}. Kies betalen bij afhalen.`)
  if (betaalwijze === 'AAN_KASSA') {
    const reden = await aanKassaGeweigerd(klant, inst, subtotaalCent)
    if (reden) throw new BestelFout(reden)
  }
  const kostCent = transactiekost(inst.betalen, subtotaalCent)
  const totaalCent = subtotaalCent + kostCent
  const btwCent = regelData.reduce((s, r) => s + Math.round(r.totaalCent - r.totaalCent / (1 + Number(r.btwPct) / 100)), 0)
    + Math.round(kostCent - kostCent / (1 + inst.betalen.transactiekostBtwPct / 100))
  const punten = regelData.reduce((s, r) => s + r.punten * r.aantal, 0)
  const dag = datumNaarDb(lokaleDelen(afhaal).datum)

  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(424242)`
    const laatste = await tx.bestelling.aggregate({ where: { dag }, _max: { nummer: true } })
    return tx.bestelling.create({
      data: {
        nummer: (laatste._max.nummer || 0) + 1,
        dag,
        klantId: klant.id,
        klantNaam: `${klant.voornaam} ${klant.naam}`.trim(),
        klantEmail: klant.email,
        klantTelefoon: klant.telefoon,
        afhaalTijd: afhaal,
        slotMinuten: Math.max(5, inst.bestellen.slotMinuten),
        totaalCent, btwCent,
        betaalwijze,
        betaalStatus: betaalwijze === 'ONLINE' ? 'OPEN' : 'NVT',
        transactiekostCent: kostCent,
        kostLabel: kostCent > 0 ? (inst.betalen.transactiekostLabel || 'Servicekost') : null,
        opmerking: opmerking?.toString().slice(0, 500) || null,
        puntenVerdiend: punten,
        regels: { create: regelData.map(r => ({ ...r, keuzes: r.keuzes, aanpassingen: r.aanpassingen })) },
      },
      include: { regels: true },
    })
  })
}

const STATUS_MAIL: Partial<Record<BestelStatus, { onderwerp: string; titel: string; tekst: (b: Bestelling) => string }>> = {
  ONTVANGEN: {
    onderwerp: 'Bestelling goed ontvangen',
    titel: 'Bedankt, we hebben je bestelling goed ontvangen!',
    tekst: b => `Je bestelling <strong>#${b.nummer}</strong> (${euro(b.totaalCent)}) ligt klaar op <strong>${formatDatumLang(lokaleDelen(b.afhaalTijd).datum)} tussen ${formatTijd(b.afhaalTijd)} en ${formatTijd(new Date(b.afhaalTijd.getTime() + b.slotMinuten * 60000))}</strong>. ${b.betaalStatus === 'BETAALD' ? 'Je online betaling is goed ontvangen — je hoeft aan de kassa niets meer te betalen.' : 'Je betaalt bij het afhalen aan de kassa.'}`,
  },
  BEZIG: {
    onderwerp: 'We zijn bezig aan je bestelling',
    titel: 'We zijn bezig aan je bestelling 🥪',
    tekst: b => `Je bestelling <strong>#${b.nummer}</strong> wordt nu klaargemaakt.`,
  },
  KLAAR: {
    onderwerp: 'Je bestelling is klaar voor afhaling',
    titel: 'Je bestelling is klaar!',
    tekst: b => `Je bestelling <strong>#${b.nummer}</strong> ligt klaar. Je mag meteen doorlopen naar de kassa.`,
  },
  GEANNULEERD: {
    onderwerp: 'Je bestelling werd geannuleerd',
    titel: 'Je bestelling werd geannuleerd',
    tekst: b => `Je bestelling <strong>#${b.nummer}</strong> werd geannuleerd.${b.betaalStatus === 'TERUGBETAALD' ? ` Het bedrag van ${euro(b.totaalCent)} wordt teruggestort; dat kan enkele werkdagen duren.` : ''} Vragen? Bel ons gerust.`,
  },
}

// Pushbericht in de app bij de belangrijkste statussen
const STATUS_PUSH: Partial<Record<BestelStatus, { titel: string; tekst: (b: Bestelling) => string }>> = {
  KLAAR: { titel: 'Je bestelling is klaar! 🥪', tekst: b => `Bestelling #${b.nummer} ligt klaar aan de kassa.` },
  GEANNULEERD: { titel: 'Bestelling geannuleerd', tekst: b => `Je bestelling #${b.nummer} werd geannuleerd.${b.betaalStatus === 'TERUGBETAALD' ? ' Het bedrag wordt teruggestort.' : ''}` },
}

async function stuurStatusPush(b: Bestelling) {
  const cfg = STATUS_PUSH[b.status]
  if (!cfg || !b.klantId) return
  if (b.status !== 'GEANNULEERD' && !(await voorkeur(b.klantId, 'bestelstatus')).push) return
  await stuurPushAanKlant(b.klantId, { titel: cfg.titel, tekst: cfg.tekst(b), url: `${SITE}/bestelling/${b.id}` })
}

// Nieuwe bestelling zichtbaar op de kassa (aan kassa: meteen; online: na betaling) → melding op de kassa-toestellen
export function meldNieuweBestelling(b: Bestelling) {
  stuurPushAanBeheerders({
    titel: `Nieuwe bestelling #${b.nummer}`,
    tekst: `${b.klantNaam} · afhalen ${formatTijd(b.afhaalTijd)} · ${euro(b.totaalCent)}${b.betaalStatus === 'BETAALD' ? ' (betaald)' : ''}`,
    url: `${SITE}/kassa`,
  }).catch(e => console.error('[push] beheerders', e))
}

export async function stuurStatusMail(b: Bestelling) {
  stuurStatusPush(b).catch(e => console.error('[push] status', e))
  const cfg = STATUS_MAIL[b.status]
  if (!cfg || !b.klantEmail) return
  // Bevestiging en annulatie altijd; 'bezig' en 'klaar' volgens de voorkeur van de klant
  if (b.klantId && b.status !== 'ONTVANGEN' && b.status !== 'GEANNULEERD' && !(await voorkeur(b.klantId, 'bestelstatus')).mail) return
  await stuurMail(b.klantEmail, `${cfg.onderwerp} – De Sneppe`, cfg.titel, [cfg.tekst(b)], { tekst: 'Bekijk je bestelling', url: `${SITE}/bestelling/${b.id}` })
}

// Status wijzigen + punten verrekenen + mail
export async function wijzigStatus(id: string, status: BestelStatus, opties: { terugbetalen?: boolean } = {}) {
  const oud = await prisma.bestelling.findUnique({ where: { id } })
  if (!oud) return null
  if (oud.status === status) return oud
  if (status === 'GEANNULEERD' && opties.terugbetalen) await terugbetalen(oud)
  const b = await prisma.bestelling.update({ where: { id }, data: { status, statusGewijzigdOp: new Date() } })

  if (b.klantId && b.puntenVerdiend > 0) {
    const bestaand = await prisma.loyaltyTransactie.findMany({ where: { bestellingId: b.id } })
    const saldo = bestaand.reduce((s, t) => s + t.punten, 0)
    const moetPunten = status === 'KLAAR' || status === 'AFGEHAALD'
    if (moetPunten && saldo === 0) {
      await prisma.$transaction([
        prisma.loyaltyTransactie.create({ data: { klantId: b.klantId, punten: b.puntenVerdiend, reden: `Bestelling #${b.nummer}`, bestellingId: b.id } }),
        prisma.klant.update({ where: { id: b.klantId }, data: { punten: { increment: b.puntenVerdiend } } }),
      ])
      await checkBeloningBereikt(b.klantId, b.puntenVerdiend)
    } else if ((status === 'GEANNULEERD' || status === 'NIET_AFGEHAALD') && saldo > 0) {
      // nooit onder nul (punten kunnen intussen al ingewisseld zijn)
      const k = await prisma.klant.findUnique({ where: { id: b.klantId }, select: { punten: true } })
      const terug = Math.min(saldo, Math.max(0, k?.punten ?? 0))
      if (terug > 0) await prisma.$transaction([
        prisma.loyaltyTransactie.create({ data: { klantId: b.klantId, punten: -terug, reden: `Annulatie bestelling #${b.nummer}`, bestellingId: b.id } }),
        prisma.klant.update({ where: { id: b.klantId }, data: { punten: { decrement: terug } } }),
      ])
    }
  }
  if (status === 'NIET_AFGEHAALD' && oud.status !== 'NIET_AFGEHAALD' && b.klantId && b.betaalwijze === 'AAN_KASSA') {
    await prisma.klant.update({ where: { id: b.klantId }, data: { noShows: { increment: 1 } } })
  }
  if (oud.status === 'NIET_AFGEHAALD' && status !== 'NIET_AFGEHAALD' && b.klantId && b.betaalwijze === 'AAN_KASSA') {
    await prisma.klant.updateMany({ where: { id: b.klantId, noShows: { gt: 0 } }, data: { noShows: { decrement: 1 } } })
  }
  if (status !== 'AFGEHAALD' && status !== 'NIET_AFGEHAALD') stuurStatusMail(b).catch(() => {})
  return b
}

// Mail sturen wanneer de klant net een beloning kan verzilveren
async function checkBeloningBereikt(klantId: string, bijgekomen: number) {
  const k = await prisma.klant.findUnique({ where: { id: klantId } })
  if (!k) return
  const vk = await voorkeur(klantId, 'spaarpunten')
  if (!vk.mail && !vk.push) return
  const beloningen = await prisma.loyaltyBeloning.findMany({ where: { actief: true }, orderBy: { punten: 'asc' } })
  const nieuw = beloningen.filter(b => k.punten >= b.punten && k.punten - bijgekomen < b.punten)
  if (!nieuw.length) return
  if (vk.push) stuurPushAanKlant(klantId, { titel: `Proficiat ${k.voornaam}! 🎁`, tekst: `Je kan nu verzilveren: ${nieuw.map(b => b.naam).join(', ')}.`, url: `${SITE}/account#punten` }).catch(() => {})
  if (!vk.mail) return
  await stuurMail(k.email, 'Proficiat! Je kan een beloning verzilveren – De Sneppe', `Proficiat ${k.voornaam}! 🎉`, [
    `Je spaarde al <strong>${k.punten} punten</strong>. Daarmee kan je nu verzilveren: <strong>${nieuw.map(b => b.naam).join(', ')}</strong>.`,
    'Open je account, klik op “Verzilveren” en toon de QR-code aan de kassa.',
  ], { tekst: 'Naar mijn punten', url: `${SITE}/account#punten` })
}

// ─── Online betalen (Mollie) ────────────────────────────────────────────────

export async function startBetaling(b: Bestelling, app = false): Promise<string> {
  const m = await mollie()
  if (!m) throw new BestelFout('Online betalen is momenteel niet mogelijk.')
  const p = await m.payments.create({
    amount: { currency: 'EUR', value: (b.totaalCent / 100).toFixed(2) },
    description: `De Sneppe – bestelling #${b.nummer}`,
    redirectUrl: app ? `${SITE}/api/betalen/terug/${b.id}` : `${SITE}/bestelling/${b.id}?betaling=1`,
    webhookUrl: `${SITE}/api/webhooks/mollie`,
    locale: 'nl_BE' as never,
    metadata: { bestellingId: b.id },
  })
  await prisma.bestelling.update({ where: { id: b.id }, data: { molliePaymentId: p.id, betaalStatus: 'OPEN' } })
  const url = p.getCheckoutUrl()
  if (!url) throw new BestelFout('Kon de betaalpagina niet openen. Probeer opnieuw.')
  return url
}

// Status ophalen bij Mollie en de bestelling bijwerken (webhook + terugkeer van de klant)
export async function syncBetaling(paymentId: string) {
  const m = await mollie()
  if (!m) return null
  const p = await m.payments.get(paymentId)
  const b = await prisma.bestelling.findUnique({ where: { molliePaymentId: p.id } })
  if (!b) return null
  if (p.status === 'paid') {
    const volledigTerug = p.amountRefunded && Number(p.amountRefunded.value) >= Number(p.amount.value)
    if (volledigTerug && b.betaalStatus !== 'TERUGBETAALD') {
      return prisma.bestelling.update({ where: { id: b.id }, data: { betaalStatus: 'TERUGBETAALD' } })
    }
    // atomair: enkel de eerste keer OPEN → BETAALD (webhook en terugkeer kunnen tegelijk komen)
    const upd = await prisma.bestelling.updateMany({ where: { id: b.id, betaalStatus: { in: ['OPEN', 'MISLUKT'] } }, data: { betaalStatus: 'BETAALD', betaaldOp: new Date(), status: 'ONTVANGEN', statusGewijzigdOp: new Date() } })
    const nieuw = await prisma.bestelling.findUnique({ where: { id: b.id } })
    if (upd.count === 1 && nieuw) { stuurStatusMail(nieuw).catch(() => {}); meldNieuweBestelling(nieuw) }
    return nieuw
  }
  if (['failed', 'canceled', 'expired'].includes(p.status)) {
    await prisma.bestelling.updateMany({ where: { id: b.id, betaalStatus: 'OPEN' }, data: { betaalStatus: 'MISLUKT', status: 'GEANNULEERD', statusGewijzigdOp: new Date() } })
    return prisma.bestelling.findUnique({ where: { id: b.id } })
  }
  return b
}

export async function terugbetalen(b: Bestelling) {
  if (b.betaalwijze !== 'ONLINE' || b.betaalStatus !== 'BETAALD' || !b.molliePaymentId) return false
  const m = await mollie()
  if (!m) throw new Error('Geen Mollie-koppeling')
  await m.paymentRefunds.create({ paymentId: b.molliePaymentId, amount: { currency: 'EUR', value: (b.totaalCent / 100).toFixed(2) }, description: `Annulatie bestelling #${b.nummer}` })
  await prisma.bestelling.update({ where: { id: b.id }, data: { betaalStatus: 'TERUGBETAALD' } })
  return true
}

// Online bestellingen die (nog) niet betaald zijn, horen niet op de kassa en tellen niet mee
export const ZICHTBAAR_OP_KASSA = { NOT: { betaalwijze: 'ONLINE', betaalStatus: { in: ['OPEN', 'MISLUKT'] as BetaalStatus[] } } }
