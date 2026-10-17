import { prisma } from './db'

export type Instellingen = {
  bedrijf: {
    naam: string
    handelsnaam: string
    adres: string
    postcode: string
    gemeente: string
    telefoon: string
    email: string
    btwNummer: string
    lat: number
    lng: number
    facebook: string
    instagram: string
    googlePlaceId: string
  }
  bestellen: {
    actief: boolean
    slotMinuten: number
    capaciteitCentPerSlot: number // 0 = onbeperkt
    maxBestellingenPerSlot: number // 0 = onbeperkt
    minVoorbereidingMinuten: number
    maxDagenVooruit: number
    laatsteSlotVoorSluitenMinuten: number
    bevestigingTekst: string
    bannerTekst: string
    noShowLimiet: number // vanaf zoveel no-shows enkel nog online betalen (0 = uit)
    maxOpenAanKassa: number // max. openstaande bestellingen 'betalen bij afhalen' per klant
    maxEersteBestellingCent: number // nieuwe klant: max. bedrag bij betalen aan de kassa (0 = onbeperkt)
  }
  printers: {
    ticketIp: string
    ticketType: 'EPSON_EPOS' | 'GEEN'
    stickerIp: string
    stickerType: 'EPSON_EPOS' | 'BROWSER' | 'GEEN'
    stickerBreedteMm: number
    autoPrint: boolean
  }
  betalen: {
    onlineActief: boolean
    aanKassaActief: boolean
    mollieApiKey: string // geheim: wordt afgeschermd naar de browser gestuurd
    // Servicekost op een online bestelling, ONGEACHT de betaalwijze (een toeslag voor elektronisch betalen is verboden)
    servicekostActief: boolean
    transactiekostCent: number
    transactiekostOnderCent: number // 0 = bij elke online bestelling
    onlineVanafCent: number // online betalen pas mogelijk vanaf dit bedrag (0 = altijd)
    transactiekostLabel: string
    transactiekostBtwPct: number
  }
  ticketOntwerp: TicketOntwerp
  stickerOntwerp: StickerOntwerp
  standaardBtwPct: number
}

export type TicketOntwerp = {
  papierMm: number // 80 of 58
  logo: boolean
  koptekst: string
  klantGroot: boolean
  productGroot: boolean
  toonNummer: boolean
  toonTelefoon: boolean
  toonBesteltijd: boolean
  toonPrijzen: boolean
  toonTotaal: boolean
  toonOpmerking: boolean
  toonBetaalstatus: boolean
  voettekst: string
  kopieen: number
}

export type StickerOntwerp = {
  rond: boolean // ronde sticker: breedteMm = diameter
  breedteMm: number
  hoogteMm: number
  logo: boolean
  klantGroot: boolean
  productGroot: boolean
  toonKeuzes: boolean
  toonAanpassingen: boolean
  toonAfhaaltijd: boolean
  toonNummer: boolean
  toonVolgnummer: boolean
  voettekst: string
}

export const STANDAARD: Instellingen = {
  bedrijf: {
    naam: 'De Sneppe',
    handelsnaam: 'De Sneppe bij Luna',
    adres: 'Bruggesteenweg 83',
    postcode: '8760',
    gemeente: 'Meulebeke',
    telefoon: '051 43 69 57',
    email: 'info@de-sneppe.be',
    btwNummer: 'BE0799256937',
    lat: 50.962558,
    lng: 3.244038,
    facebook: 'https://www.facebook.com/broodjesdesneppe/',
    instagram: 'https://www.instagram.com/desneppe/',
    googlePlaceId: '',
  },
  bestellen: {
    actief: true,
    slotMinuten: 15,
    capaciteitCentPerSlot: 5500,
    maxBestellingenPerSlot: 3,
    minVoorbereidingMinuten: 30,
    maxDagenVooruit: 7,
    laatsteSlotVoorSluitenMinuten: 15,
    bevestigingTekst: 'Bedankt voor je bestelling, we gaan ermee aan de slag! Je bestelling ligt klaar op het gekozen tijdstip — je mag meteen doorlopen naar de kassa.',
    bannerTekst: 'Bestel online en schuif meteen aan bij de kassa!',
    noShowLimiet: 2,
    maxOpenAanKassa: 3,
    maxEersteBestellingCent: 4000,
  },
  printers: {
    ticketIp: '',
    ticketType: 'EPSON_EPOS',
    stickerIp: '',
    stickerType: 'EPSON_EPOS',
    stickerBreedteMm: 58,
    autoPrint: true,
  },
  betalen: {
    onlineActief: false,
    aanKassaActief: true,
    mollieApiKey: '',
    servicekostActief: false,
    transactiekostCent: 0,
    transactiekostOnderCent: 1000,
    onlineVanafCent: 0,
    transactiekostLabel: 'Servicekost',
    transactiekostBtwPct: 21,
  },
  ticketOntwerp: {
    papierMm: 80,
    logo: true,
    koptekst: 'DE SNEPPE\nOnline bestelling',
    klantGroot: true,
    productGroot: true,
    toonNummer: true,
    toonTelefoon: true,
    toonBesteltijd: true,
    toonPrijzen: false,
    toonTotaal: true,
    toonOpmerking: true,
    toonBetaalstatus: true,
    voettekst: 'Smakelijk!',
    kopieen: 1,
  },
  stickerOntwerp: {
    rond: true,
    breedteMm: 40,
    hoogteMm: 40,
    logo: false,
    klantGroot: true,
    productGroot: true,
    toonKeuzes: true,
    toonAanpassingen: true,
    toonAfhaaltijd: true,
    toonNummer: true,
    toonVolgnummer: true,
    voettekst: '',
  },
  standaardBtwPct: 6,
}

type Sleutel = keyof Instellingen

export async function getInstellingen(): Promise<Instellingen> {
  const rijen = await prisma.instelling.findMany()
  const res = structuredClone(STANDAARD) as Record<string, unknown>
  for (const r of rijen) {
    const def = (STANDAARD as Record<string, unknown>)[r.sleutel]
    if (def === undefined) continue
    res[r.sleutel] = typeof def === 'object' && def !== null
      ? { ...(def as object), ...(r.waarde as object) }
      : r.waarde
  }
  return res as Instellingen
}

export async function setInstelling<K extends Sleutel>(sleutel: K, waarde: Instellingen[K]) {
  await prisma.instelling.upsert({
    where: { sleutel },
    create: { sleutel, waarde: waarde as never },
    update: { waarde: waarde as never },
  })
}

// Servicekost voor een online bestelling van `subtotaalCent` — hangt NIET af van de betaalwijze
export function transactiekost(b: Instellingen['betalen'], subtotaalCent: number): number {
  if (!b.servicekostActief || !b.transactiekostCent) return 0
  if (b.transactiekostOnderCent > 0 && subtotaalCent >= b.transactiekostOnderCent) return 0
  return b.transactiekostCent
}

export function maskeerSleutel(k: string) {
  return k ? `${k.slice(0, 5)}••••••••${k.slice(-4)}` : ''
}
