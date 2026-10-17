import { prisma } from './db'

// Bewerkbare teksten. Sleutel → standaardwaarde. Luna kan deze aanpassen via Admin → Website.
export const INHOUD_VELDEN: { sleutel: string; label: string; groep: string; standaard: string; lang?: boolean; fotos?: number }[] = [
  { groep: 'Home', sleutel: 'home.fotos', label: 'Foto’s bovenaan de homepagina', standaard: '', fotos: 4 },
  { groep: 'Home', sleutel: 'home.titel', label: 'Grote titel', standaard: 'Verse broodjes in Meulebeke' },
  { groep: 'Home', sleutel: 'home.intro', label: 'Intro onder de titel', lang: true, standaard: 'Bij De Sneppe kan je terecht voor koude en warme broodjes, panini’s, wraps, pasta, verse soep en dagschotels. Elke dag vers belegd — bestel online en haal je lunch af zonder wachten.' },
  { groep: 'Home', sleutel: 'home.usp1.titel', label: 'Troef 1 – titel', standaard: 'Elke dag vers' },
  { groep: 'Home', sleutel: 'home.usp1.tekst', label: 'Troef 1 – tekst', lang: true, standaard: 'Groenten, beleg en huisbereide salades: elke ochtend vers klaargemaakt.' },
  { groep: 'Home', sleutel: 'home.usp2.titel', label: 'Troef 2 – titel', standaard: 'Online bestellen' },
  { groep: 'Home', sleutel: 'home.usp2.tekst', label: 'Troef 2 – tekst', lang: true, standaard: 'Kies je afhaalmoment per kwartier. Je broodje ligt klaar, jij schuift meteen aan bij de kassa.' },
  { groep: 'Home', sleutel: 'home.usp3.titel', label: 'Troef 3 – titel', standaard: 'Vanaf 6 uur open' },
  { groep: 'Home', sleutel: 'home.usp3.tekst', label: 'Troef 3 – tekst', lang: true, standaard: 'Vroege vogel of lunchpauze: van maandag tot vrijdag sta je bij ons vanaf 6 uur ’s ochtends welkom.' },
  { groep: 'Over ons', sleutel: 'over.fotos', label: 'Foto’s naast het verhaal', standaard: '', fotos: 3 },
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
