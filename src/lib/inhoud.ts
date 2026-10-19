import { prisma } from './db'

// Bewerkbare teksten. Sleutel → standaardwaarde. Luna kan deze aanpassen via Admin → Website.
export const INHOUD_VELDEN: { sleutel: string; label: string; groep: string; standaard: string; lang?: boolean; fotos?: number }[] = [
  { groep: 'Home', sleutel: 'home.fotos', label: 'Foto’s bovenaan de homepagina', standaard: '/media/site/luna-broodje-smeren-kader.jpg,/media/site/feestbroodjes.jpg,/media/site/gevel.jpg,/media/site/pistolet-hesp-kaas.jpg', fotos: 4 },
  { groep: 'Home', sleutel: 'home.titel', label: 'Grote titel', standaard: 'Verse broodjes in Meulebeke' },
  { groep: 'Home', sleutel: 'home.intro', label: 'Intro onder de titel', lang: true, standaard: 'Bij De Sneppe kan je terecht voor koude en warme broodjes, panini’s, wraps, pasta, verse soep en dagschotels. Elke dag vers belegd — bestel online en haal je lunch af zonder wachten.' },
  { groep: 'Home', sleutel: 'home.usp1.titel', label: 'Troef 1 – titel', standaard: 'Elke dag vers' },
  { groep: 'Home', sleutel: 'home.usp1.tekst', label: 'Troef 1 – tekst', lang: true, standaard: 'Groenten, beleg en huisbereide salades: elke ochtend vers klaargemaakt.' },
  { groep: 'Home', sleutel: 'home.usp2.titel', label: 'Troef 2 – titel', standaard: 'Online bestellen' },
  { groep: 'Home', sleutel: 'home.usp2.tekst', label: 'Troef 2 – tekst', lang: true, standaard: 'Kies je afhaalmoment per kwartier. Je broodje ligt klaar, jij schuift meteen aan bij de kassa.' },
  { groep: 'Home', sleutel: 'home.usp3.titel', label: 'Troef 3 – titel', standaard: 'Vanaf 6 uur open' },
  { groep: 'Home', sleutel: 'home.usp3.tekst', label: 'Troef 3 – tekst', lang: true, standaard: 'Vroege vogel of lunchpauze: van maandag tot vrijdag sta je bij ons vanaf 6 uur ’s ochtends welkom.' },
  { groep: 'Home', sleutel: 'home.strook.titel', label: 'Fotostrook – titel', standaard: 'Vers bij Luna' },
  { groep: 'Home', sleutel: 'home.strook.fotos', label: 'Fotostrook – foto’s', standaard: '/media/site/pistolet-zalm.jpg,/media/site/stokbrood-detail.jpg,/media/site/koffiekoeken.jpg,/media/site/pastabox.jpg,/media/site/luna-aan-de-toog.jpg,/media/site/orzosalade.jpg,/media/site/stokbroden.jpg,/media/site/pistolet-salami.jpg', fotos: 8 },
  { groep: 'Home', sleutel: 'home.schotels.titel', label: 'Feestbroodjes – titel', standaard: 'Mini-broodjes & feestbroodjes' },
  { groep: 'Home', sleutel: 'home.schotels.tekst', label: 'Feestbroodjes – tekst', lang: true, standaard: 'Een vergadering, verjaardag of personeelsfeest? Wij maken mini-broodjes en belegde halve stokbroodjes op maat.\n\nBel of mail ons minstens een dag op voorhand, dan zorgen wij voor de rest.' },
  { groep: 'Home', sleutel: 'home.schotels.fotos', label: 'Feestbroodjes – foto’s', standaard: '/media/site/mini-broodjes.jpg,/media/site/feestbroodjes-2.jpg,/media/site/feestbroodjes.jpg', fotos: 3 },
  { groep: 'Home', sleutel: 'home.automaat.titel', label: 'Broodjesautomaat – titel', standaard: 'Ook ’s nachts honger?' },
  { groep: 'Home', sleutel: 'home.automaat.tekst', label: 'Broodjesautomaat – tekst', lang: true, standaard: 'Aan onze zaak aan de Bruggesteenweg staat een automaat die dag en nacht bereikbaar is, 7 dagen op 7. Een drankje, een snack of iets lekkers voor onderweg: ook buiten de openingsuren ben je bij De Sneppe aan het juiste adres.' },
  { groep: 'Home', sleutel: 'home.automaat.fotos', label: 'Broodjesautomaat – foto', standaard: '/media/site/broodjesautomaat-2.jpg', fotos: 1 },
  { groep: 'Over ons', sleutel: 'over.fotos', label: 'Foto’s naast het verhaal', standaard: '/media/site/luna-lacht.jpg,/media/site/interieur.jpg,/media/site/luna-in-de-winkel.jpg', fotos: 3 },
  { groep: 'Over ons', sleutel: 'over.titel', label: 'Titel', standaard: 'De Sneppe bij Luna' },
  { groep: 'Over ons', sleutel: 'over.tekst', label: 'Verhaal', lang: true, standaard: 'De Sneppe is dé broodjesbar aan de Bruggesteenweg in Meulebeke. Achter de toog staat Luna met haar team, elke werkdag vanaf 6 uur ’s ochtends.\n\nOns aanbod is eenvoudig en eerlijk: royaal belegde broodjes — van een klassieke smos of martino tot een brie met honing en pijnboompitten — warme broodjes, panini’s, wraps, pasta, verse soep en een wisselende dagschotel. Alles wordt vers klaargemaakt, zoals jij het wil: zonder groenten, met bruin brood of net dat extra sausje.\n\nNaast broodjes vind je bij ons ook dranken, snoep, dagbladen en lotto. Kom gerust binnen, of bestel online en haal je bestelling af op het moment dat jou past.' },
  { groep: 'Contact', sleutel: 'contact.intro', label: 'Intro', lang: true, standaard: 'Vragen over een bestelling, een grote bestelling voor je bedrijf of vergadering, of gewoon een vraag over allergenen? Bel of mail ons gerust.' },
  { groep: 'Contact', sleutel: 'contact.parkeren', label: 'Bereikbaarheid / parkeren', lang: true, standaard: 'Je vindt ons aan de Bruggesteenweg 83 in Meulebeke.' },
]

export async function getInhoud(): Promise<Record<string, string>> {
  const rijen = await prisma.inhoud.findMany()
  const res: Record<string, string> = {}
  for (const v of INHOUD_VELDEN) res[v.sleutel] = v.standaard
  for (const r of rijen) res[r.sleutel] = r.waarde
  return res
}

export function fotoLijst(waarde: string | undefined): string[] {
  return (waarde || '').split(',').map(x => x.trim()).filter(x => x.startsWith('/'))
}
