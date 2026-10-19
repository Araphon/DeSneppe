import { datumPlus, lokaalNaarUtc, vandaagLokaal } from './tijd'

// Demo-modus voor het reviewer-account van de kassa-app (App Store-review):
// nep-bestellingen van vandaag, statuswijzigingen enkel in het geheugen — nooit echte bestellingen of klantgegevens.

type Status = 'ONTVANGEN' | 'BEZIG' | 'KLAAR' | 'AFGEHAALD' | 'NIET_AFGEHAALD' | 'GEANNULEERD'
type Regel = { productNaam: string; aantal: number; eenheidCent: number; keuzes?: { optie: string; keuze: string; prijsCent: number }[]; aanpassingen?: { naam: string; prijsCent: number }[]; sticker?: boolean }
type Sjabloon = { tijd: string; naam: string; status: Status; online?: boolean; opmerking?: string; regels: Regel[] }

const BROOD = (k: string) => [{ optie: 'Brood', keuze: k, prijsCent: 0 }]

const SJABLONEN: Sjabloon[] = [
  { tijd: '11:30', naam: 'Demo Klant 1', status: 'AFGEHAALD', regels: [
    { productNaam: 'Smos kaas en hesp', aantal: 2, eenheidCent: 520, keuzes: BROOD('Bruin'), sticker: true },
    { productNaam: 'Tomatensoep', aantal: 1, eenheidCent: 350 },
  ] },
  { tijd: '11:45', naam: 'Demo Klant 2', status: 'KLAAR', online: true, regels: [
    { productNaam: 'Kip curry', aantal: 1, eenheidCent: 560, keuzes: BROOD('Wit'), aanpassingen: [{ naam: 'Zonder ui', prijsCent: 0 }], sticker: true },
  ] },
  { tijd: '12:00', naam: 'Demo Klant 3', status: 'BEZIG', opmerking: 'Graag apart verpakken', regels: [
    { productNaam: 'Panini mozzarella', aantal: 1, eenheidCent: 650, sticker: true },
    { productNaam: 'Martino', aantal: 1, eenheidCent: 540, keuzes: BROOD('Bruin'), aanpassingen: [{ naam: 'Extra pickles', prijsCent: 50 }], sticker: true },
  ] },
  { tijd: '12:15', naam: 'Demo Klant 4', status: 'ONTVANGEN', online: true, regels: [
    { productNaam: 'Wrap kip', aantal: 2, eenheidCent: 690, sticker: true },
    { productNaam: 'Spuitwater', aantal: 2, eenheidCent: 250 },
  ] },
  { tijd: '12:30', naam: 'Demo Klant 5', status: 'ONTVANGEN', regels: [
    { productNaam: 'Dagschotel', aantal: 1, eenheidCent: 1250 },
  ] },
  { tijd: '13:00', naam: 'Demo Klant 6', status: 'ONTVANGEN', regels: [
    { productNaam: 'Gezond', aantal: 3, eenheidCent: 500, keuzes: BROOD('Wit'), sticker: true },
  ] },
]

// Statuswijzigingen van de reviewer, per dag (1 worker → geheugen volstaat)
let staat: { datum: string; status: Map<string, Status> } = { datum: '', status: new Map() }
function statussen() {
  const d = vandaagLokaal()
  if (staat.datum !== d) staat = { datum: d, status: new Map() }
  return staat.status
}

export function demoBestellingen(datum: string) {
  if (datum !== vandaagLokaal()) return []
  const st = statussen()
  const gisteren = lokaalNaarUtc(datumPlus(datum, -1), '20:00')
  return SJABLONEN.map((s, i) => {
    const id = `demo-${i + 1}`
    const regels = s.regels.map((r, j) => {
      const extra = (r.keuzes || []).reduce((a, k) => a + k.prijsCent, 0) + (r.aanpassingen || []).reduce((a, k) => a + k.prijsCent, 0)
      return {
        id: `${id}-${j}`, productNaam: r.productNaam, aantal: r.aantal, eenheidCent: r.eenheidCent + extra,
        totaalCent: (r.eenheidCent + extra) * r.aantal, leeftijdsgrens: null,
        keuzes: r.keuzes || [], aanpassingen: r.aanpassingen || [], stickerPrinten: Boolean(r.sticker),
      }
    })
    const totaal = regels.reduce((a, r) => a + r.totaalCent, 0)
    return {
      id, nummer: 101 + i, slotMinuten: 15, status: st.get(id) || s.status,
      klantNaam: s.naam, klantTelefoon: null, afhaalTijd: lokaalNaarUtc(datum, s.tijd).toISOString(),
      aangemaaktOp: new Date(gisteren.getTime() + i * 37 * 60000).toISOString(), totaalCent: totaal,
      opmerking: s.opmerking || null, geprintOp: new Date(gisteren.getTime()).toISOString(), regels,
      betaalwijze: s.online ? 'ONLINE' : 'AAN_KASSA', betaalStatus: s.online ? 'BETAALD' : 'NVT',
      transactiekostCent: 0, kostLabel: null,
    }
  })
}

export function demoZetStatus(id: string, status: Status) {
  const b = demoBestellingen(vandaagLokaal()).find(x => x.id === id)
  if (!b) return null
  statussen().set(id, status)
  return { ...b, status }
}
