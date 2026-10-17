import type { Klant } from '@prisma/client'
import { prisma } from './db'
import type { Instellingen } from './instellingen'

// Mag deze klant betalen bij afhalen? Zo niet: waarom.
export async function aanKassaGeweigerd(k: Klant, inst: Instellingen, subtotaalCent?: number): Promise<string | null> {
  const b = inst.bestellen
  if (k.alleenOnline) return 'Voor jouw account is enkel online betalen mogelijk.'
  if (b.noShowLimiet > 0 && k.noShows >= b.noShowLimiet) return 'Omdat eerdere bestellingen niet werden afgehaald, kan je enkel nog online betalen.'
  if (b.maxOpenAanKassa > 0) {
    const open = await prisma.bestelling.count({ where: { klantId: k.id, betaalwijze: 'AAN_KASSA', status: { in: ['ONTVANGEN', 'BEZIG', 'KLAAR'] }, afhaalTijd: { gt: new Date(Date.now() - 2 * 3600000) } } })
    if (open >= b.maxOpenAanKassa) return `Je hebt al ${open} openstaande bestellingen met betaling aan de kassa. Betaal online of wacht tot ze afgehaald zijn.`
  }
  if (subtotaalCent !== undefined && b.maxEersteBestellingCent > 0 && subtotaalCent > b.maxEersteBestellingCent) {
    const afgehaald = await prisma.bestelling.count({ where: { klantId: k.id, status: { in: ['AFGEHAALD', 'KLAAR'] } } })
    if (!afgehaald) return `Bij je eerste bestelling kan je tot ${(b.maxEersteBestellingCent / 100).toFixed(2).replace('.', ',')} euro aan de kassa betalen. Voor een grotere bestelling betaal je online of bel je ons.`
  }
  return null
}

// Kleine lijst bekende wegwerp-e-maildomeinen
const WEGWERP = new Set(['mailinator.com', 'yopmail.com', 'guerrillamail.com', 'sharklasers.com', '10minutemail.com', 'temp-mail.org', 'tempmail.com', 'trashmail.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com', 'fakeinbox.com', 'emailondeck.com', 'mohmal.com', 'tempail.com', 'mintemail.com', 'spamgourmet.com', 'mailnesia.com', 'mytemp.email'])
export function isWegwerpMail(email: string) {
  return WEGWERP.has(email.split('@')[1]?.toLowerCase() || '')
}

// Cloudflare Turnstile (optioneel: enkel actief als de sleutels ingesteld zijn)
export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY || ''
export async function checkTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: token, remoteip: ip }) })
    return Boolean((await r.json()).success)
  } catch { return false }
}

export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'onbekend'
}
