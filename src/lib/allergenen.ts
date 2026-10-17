import type { MenuAllergeen } from './catalogus'

// De 14 wettelijke allergenen (EU-verordening 1169/2011)
export const EU_ALLERGENEN: { naam: string; icoon: string }[] = [
  { naam: 'Gluten', icoon: '🌾' },
  { naam: 'Schaaldieren', icoon: '🦐' },
  { naam: 'Eieren', icoon: '🥚' },
  { naam: 'Vis', icoon: '🐟' },
  { naam: 'Pinda’s', icoon: '🥜' },
  { naam: 'Soja', icoon: '🫘' },
  { naam: 'Melk', icoon: '🥛' },
  { naam: 'Noten', icoon: '🌰' },
  { naam: 'Selder', icoon: '🥬' },
  { naam: 'Mosterd', icoon: '🟡' },
  { naam: 'Sesamzaad', icoon: '⚪' },
  { naam: 'Sulfiet', icoon: '🍷' },
  { naam: 'Lupine', icoon: '🌼' },
  { naam: 'Weekdieren', icoon: '🦪' },
]

type OptieMin = { id: string; wijzigtAllergenen: boolean; keuzes: { id: string; allergenenLijst: MenuAllergeen[] }[] }

export type AllergenenOverzicht = { bevat: MenuAllergeen[]; sporen: MenuAllergeen[]; opmerking: string | null; ingevuld: boolean }

// Allergenen van een product met de gekozen opties: basis + allergenen van gekozen keuzes (opties met "wijzigt allergenen")
export function berekenAllergenen(
  product: { allergenenActief: boolean; allergenen: string | null; allergenenLijst: MenuAllergeen[]; opties: OptieMin[] },
  gekozen: Record<string, string>,
): AllergenenOverzicht {
  if (!product.allergenenActief) return { bevat: [], sporen: [], opmerking: null, ingevuld: false }
  const alle = [...product.allergenenLijst]
  for (const o of product.opties) {
    if (!o.wijzigtAllergenen) continue
    const k = o.keuzes.find(k => k.id === gekozen[o.id])
    if (k) alle.push(...k.allergenenLijst)
  }
  const bevat = new Map<string, MenuAllergeen>()
  const sporen = new Map<string, MenuAllergeen>()
  for (const a of alle) (a.soort === 'BEVAT' ? bevat : sporen).set(a.id, a)
  for (const id of Array.from(bevat.keys())) sporen.delete(id)
  return { bevat: Array.from(bevat.values()), sporen: Array.from(sporen.values()), opmerking: product.allergenen?.trim() || null, ingevuld: true }
}

// Alle allergenen die een product kán bevatten (ongeacht keuze) — voor de filter in de shop
export function mogelijkeAllergenen(product: { allergenenActief: boolean; allergenenLijst: MenuAllergeen[]; opties: OptieMin[] }) {
  const ids = new Set(product.allergenenLijst.filter(a => a.soort === 'BEVAT').map(a => a.id))
  const vastViaOpties = new Set<string>()
  for (const o of product.opties) {
    if (!o.wijzigtAllergenen || !o.keuzes.length) continue
    // enkel als ELKE keuze het bevat, bevat het product het zeker
    const perKeuze = o.keuzes.map(k => new Set(k.allergenenLijst.filter(a => a.soort === 'BEVAT').map(a => a.id)))
    perKeuze[0].forEach(id => { if (perKeuze.every(s => s.has(id))) vastViaOpties.add(id) })
  }
  vastViaOpties.forEach(id => ids.add(id))
  return ids
}
