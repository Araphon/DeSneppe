import { z } from 'zod'

const tekst = (min = 1, max = 120) => z.string().trim().min(min).max(max)

export const profielSchema = z.object({
  voornaam: tekst(1, 60),
  naam: tekst(1, 80),
  adres: tekst(3, 160),
  postcode: z.string().trim().regex(/^\d{4}$/, 'Postcode moet 4 cijfers zijn'),
  gemeente: tekst(2, 80),
  geboortedatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geboortedatum ontbreekt'),
  telefoon: z.string().trim().regex(/^[+\d][\d\s/.-]{7,18}$/, 'Ongeldig telefoonnummer'),
  email: z.string().trim().toLowerCase().email('Ongeldig e-mailadres'),
  mailNieuws: z.boolean().optional(),
  mailActies: z.boolean().optional(),
})

export const VELD_NAMEN: Record<string, string> = {
  voornaam: 'Voornaam', naam: 'Naam', adres: 'Adres', postcode: 'Postcode', gemeente: 'Gemeente',
  geboortedatum: 'Geboortedatum', telefoon: 'Telefoonnummer', email: 'E-mailadres', wachtwoord: 'Wachtwoord',
}

export function zodFout(e: z.ZodError) {
  const i = e.issues[0]
  const veld = String(i.path[0] || '')
  if (i.code === 'too_small' || i.code === 'invalid_type') return `${VELD_NAMEN[veld] || veld} is verplicht.`
  return i.message.startsWith('Ongeldig') || i.message.includes('moet') || i.message.includes('ontbreekt') ? i.message : `${VELD_NAMEN[veld] || veld}: ongeldige waarde.`
}

export function klantPubliek(k: { id: string; email: string; voornaam: string; naam: string; adres: string; postcode: string; gemeente: string; geboortedatum: Date | null; telefoon: string; punten: number; mailBestelling: boolean; pushBestelling: boolean; mailNieuws: boolean; mailActies: boolean }) {
  return {
    id: k.id, email: k.email, voornaam: k.voornaam, naam: k.naam, adres: k.adres, postcode: k.postcode, gemeente: k.gemeente,
    geboortedatum: k.geboortedatum ? k.geboortedatum.toISOString().slice(0, 10) : '',
    telefoon: k.telefoon, punten: k.punten,
    mailBestelling: k.mailBestelling, pushBestelling: k.pushBestelling, mailNieuws: k.mailNieuws, mailActies: k.mailActies,
    onvolledig: !k.voornaam || !k.naam || !k.adres || !k.postcode || !k.gemeente || !k.telefoon || !k.geboortedatum,
  }
}
