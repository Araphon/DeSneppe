import { getInstellingen, type Instellingen } from './instellingen'
import { berekenDag, getRegels, weekSchema, type Interval } from './openingsuren'
import { datumPlus, dagNaam, lokaleDelen, tijdVanMinuten, vandaagLokaal, formatDatumLang } from './tijd'
import type { MenuCategorie } from './catalogus'
import { euro } from './geld'

export const SITE = process.env.SITE_URL || 'https://sneppe.beehive.be'

export function intervalTekst(iv: Interval[]) {
  return iv.length ? iv.map(([a, b]) => `${tijdVanMinuten(a)}–${tijdVanMinuten(b)}`).join(' & ') : 'gesloten'
}

export function telE164(tel: string) {
  const d = tel.replace(/\D/g, '')
  return d.startsWith('0') ? '+32' + d.slice(1) : '+' + d
}

export async function getSiteData() {
  const [inst, regels] = await Promise.all([getInstellingen(), getRegels()])
  const vandaag = vandaagLokaal()
  const week = weekSchema(regels, vandaag)
  const nu = lokaleDelen(new Date())
  const nuMin = nu.uur * 60 + nu.minuut
  const dagVandaag = berekenDag(regels, vandaag)
  const nuOpen = dagVandaag.open.some(([a, b]) => nuMin >= a && nuMin < b)
  const sluitVandaag = dagVandaag.open.find(([a, b]) => nuMin >= a && nuMin < b)?.[1]
  // eerstvolgende opening
  let volgende: { datum: string; tijd: string } | null = null
  for (let i = 0; i < 30 && !volgende; i++) {
    const d = datumPlus(vandaag, i)
    const dag = berekenDag(regels, d)
    const iv = dag.open.find(([a]) => i > 0 || a > nuMin)
    if (iv) volgende = { datum: d, tijd: tijdVanMinuten(iv[0]) }
  }
  // komende uitzonderlijke sluitingen (binnen 60 dagen) op dagen die normaal open zijn
  const sluitingen: { datum: string; titel: string }[] = []
  for (let i = 0; i < 60; i++) {
    const d = datumPlus(vandaag, i)
    const normaal = berekenDag(regels.filter(r => r.type === 'OPEN'), d)
    const echt = berekenDag(regels, d)
    if (normaal.open.length && !echt.open.length) sluitingen.push({ datum: d, titel: echt.sluitingen[0] || 'Gesloten' })
  }
  return {
    inst, week, vandaag, nuOpen,
    sluitTijd: sluitVandaag !== undefined ? tijdVanMinuten(sluitVandaag) : null,
    volgende, sluitingen,
  }
}

export function statusTekst(s: Awaited<ReturnType<typeof getSiteData>>) {
  if (s.nuOpen) return `Nu open tot ${s.sluitTijd}`
  if (!s.volgende) return 'Momenteel gesloten'
  if (s.volgende.datum === s.vandaag) return `Gesloten · opent vandaag om ${s.volgende.tijd}`
  if (s.volgende.datum === datumPlus(s.vandaag, 1)) return `Gesloten · opent morgen om ${s.volgende.tijd}`
  return `Gesloten · opent ${formatDatumLang(s.volgende.datum)} om ${s.volgende.tijd}`
}

export function weekTekst(week: { dag: number; open: Interval[] }[]) {
  return week.map(w => ({ dag: dagNaam(w.dag), tekst: intervalTekst(w.open) }))
}

const SCHEMA_DAGEN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function businessJsonLd(inst: Instellingen, week: { dag: number; open: Interval[] }[]) {
  const b = inst.bedrijf
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${SITE}/#business`,
    name: b.naam,
    alternateName: ['Broodjesbar De Sneppe', b.handelsnaam],
    description: 'Broodjesbar in Meulebeke met vers belegde broodjes, warme broodjes, panini’s, wraps, pasta, verse soep en dagschotels. Online bestellen en afhalen.',
    url: SITE,
    logo: `${SITE}/icon-512.png`,
    image: `${SITE}/og.jpg`,
    telephone: telE164(b.telefoon),
    email: b.email,
    vatID: b.btwNummer,
    priceRange: '€',
    servesCuisine: ['Broodjes', 'Belgisch', 'Lunch', 'Ontbijt'],
    acceptsReservations: false,
    address: { '@type': 'PostalAddress', streetAddress: b.adres, postalCode: b.postcode, addressLocality: b.gemeente, addressRegion: 'West-Vlaanderen', addressCountry: 'BE' },
    geo: { '@type': 'GeoCoordinates', latitude: b.lat, longitude: b.lng },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.naam} ${b.adres} ${b.postcode} ${b.gemeente}`)}`,
    areaServed: ['Meulebeke', 'Tielt', 'Pittem', 'Ingelmunster', 'Oostrozebeke', 'Ardooie', 'Dentergem', 'Wakken'].map(n => ({ '@type': 'City', name: n })),
    openingHoursSpecification: week.flatMap(w => w.open.map(([a, z]) => ({
      '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${SCHEMA_DAGEN[w.dag - 1]}`, opens: tijdVanMinuten(a), closes: tijdVanMinuten(z),
    }))),
    hasMenu: `${SITE}/menu`,
    potentialAction: {
      '@type': 'OrderAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/bestellen`, inLanguage: 'nl-BE', actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'] },
      deliveryMethod: 'https://purl.org/goodrelations/v1#DeliveryModePickUp',
    },
    sameAs: [b.facebook, b.instagram].filter(Boolean),
  }
}

export function menuJsonLd(menu: MenuCategorie[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${SITE}/menu#menu`,
    name: 'Menu De Sneppe',
    inLanguage: 'nl-BE',
    hasMenuSection: menu.map(c => ({
      '@type': 'MenuSection',
      name: c.naam,
      hasMenuItem: c.producten.map(p => ({
        '@type': 'MenuItem',
        name: p.naam,
        description: p.omschrijving || undefined,
        image: p.afbeelding ? `${SITE}${p.afbeelding}` : undefined,
        offers: { '@type': 'Offer', price: (p.prijsCent / 100).toFixed(2), priceCurrency: 'EUR', availability: p.uitverkocht ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' },
        suitableForDiet: p.labels.some(l => l.naam === 'Vegan') ? 'https://schema.org/VeganDiet'
          : p.labels.some(l => l.naam === 'Veggie') ? 'https://schema.org/VegetarianDiet'
          : p.labels.some(l => l.naam === 'Glutenvrij') ? 'https://schema.org/GlutenFreeDiet' : undefined,
      })),
    })),
  }
}

export function faqLijst(inst: Instellingen, week: { dag: number; open: Interval[] }[], menu?: MenuCategorie[]) {
  const b = inst.bedrijf
  const open = weekTekst(week).filter(w => w.tekst !== 'gesloten')
  const dicht = weekTekst(week).filter(w => w.tekst === 'gesloten').map(w => w.dag)
  const goedkoopste = menu?.flatMap(c => c.producten).filter(p => /broodjes/i.test(menu.find(c => c.producten.includes(p))?.naam || '')).sort((a, z) => a.prijsCent - z.prijsCent)[0]
  return [
    { v: 'Wat zijn de openingsuren van De Sneppe in Meulebeke?', a: `De Sneppe is open op ${open.map(w => `${w.dag} van ${w.tekst}`).join(', ')}${dicht.length ? `. Op ${dicht.join(' en ')} zijn we gesloten` : ''}. Uitzonderlijke sluitingen (vakantie, feestdagen) zie je altijd op de website.` },
    { v: 'Kan ik bij De Sneppe online bestellen?', a: `Ja. Via ${SITE.replace('https://', '')}/bestellen kies je je broodjes, pas je ze aan (bijvoorbeeld zonder groenten of met bruin brood) en kies je een afhaalmoment per kwartier. Je betaalt bij het afhalen aan de kassa.` },
    { v: 'Waar is De Sneppe gelegen?', a: `Broodjesbar De Sneppe ligt aan de ${b.adres}, ${b.postcode} ${b.gemeente} (West-Vlaanderen).` },
    { v: 'Wat kan ik eten bij De Sneppe?', a: `Koude en warme belegde broodjes, panini’s, wraps, pasta, verse soep, dagschotels en dranken${goedkoopste ? `. Een belegd broodje kost vanaf ${euro(goedkoopste.prijsCent)}` : ''}.` },
    { v: 'Hebben jullie vegetarische broodjes?', a: 'Ja, onder meer broodjes met kaas, brie, geitenkaas, mozzarella of de Superveggie. Je kan bij elk broodje ook aanpassingen doorgeven.' },
    { v: 'Kan ik een grote bestelling plaatsen voor mijn bedrijf of een vergadering?', a: `Zeker. Bestel online of neem contact op via ${b.telefoon} of ${b.email}, dan bekijken we samen wat mogelijk is.` },
    { v: 'Hoe kan ik De Sneppe contacteren?', a: `Bel ons op ${b.telefoon} of mail naar ${b.email}.` },
  ]
}

export function faqJsonLd(faq: { v: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({ '@type': 'Question', name: f.v, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

export function breadcrumbJsonLd(items: { naam: string; pad: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ naam: 'Home', pad: '/' }, ...items].map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.naam, item: `${SITE}${it.pad}` })),
  }
}
