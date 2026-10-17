'use client'
export type Filters = { gemeenten?: string[]; postcodes?: string[]; laatsteBestellingMinDagen?: number | null; laatsteBestellingMaxDagen?: number | null; nooitBesteld?: boolean; bestellingenMin?: number | null; bestellingenMax?: number | null; puntenMin?: number | null; verjaardagDezeMaand?: boolean; geregistreerdBinnenDagen?: number | null; productIds?: string[]; categorieIds?: string[] }
type Trigger = { soort?: string; dagen?: number; uren?: number } | null
export function triggerTekst(t: Trigger) {
  if (!t?.soort) return ''
  return t.soort === 'VERJAARDAG' ? 'Op de verjaardag van de klant' : t.soort === 'INACTIEF' ? `${t.dagen} dagen na de laatste bestelling` : t.soort === 'NA_AFHALEN' ? `${t.uren} uur na het afhalen` : t.soort === 'NIEUWE_KLANT' ? (t.dagen ? `${t.dagen} dagen na registratie` : 'Meteen na registratie') : ''
}
export function filterTekst(f: Filters) {
  const d: string[] = []
  if (f.laatsteBestellingMinDagen) d.push(`laatste bestelling > ${f.laatsteBestellingMinDagen} dagen geleden`)
  if (f.laatsteBestellingMaxDagen) d.push(`besteld in de laatste ${f.laatsteBestellingMaxDagen} dagen`)
  if (f.nooitBesteld) d.push('nog nooit besteld')
  if (f.bestellingenMin) d.push(`minstens ${f.bestellingenMin} bestellingen`)
  if (f.bestellingenMax != null) d.push(`hoogstens ${f.bestellingenMax} bestellingen`)
  if (f.puntenMin) d.push(`minstens ${f.puntenMin} punten`)
  if (f.verjaardagDezeMaand) d.push('verjaart deze maand')
  if (f.geregistreerdBinnenDagen) d.push(`klant sinds < ${f.geregistreerdBinnenDagen} dagen`)
  if (f.gemeenten?.length) d.push(`gemeente: ${f.gemeenten.join(', ')}`)
  if (f.postcodes?.length) d.push(`postcode: ${f.postcodes.join(', ')}`)
  if (f.productIds?.length) d.push(`bestelde ooit ${f.productIds.length} gekozen product(en)`)
  if (f.categorieIds?.length) d.push(`bestelde uit ${f.categorieIds.length} categorie(ën)`)
  return d.join(' · ')
}
