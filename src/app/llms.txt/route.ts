import { getMenu } from '@/lib/catalogus'
import { euro } from '@/lib/geld'
import { faqLijst, getSiteData, SITE, weekTekst } from '@/lib/site'

export const revalidate = 300

// GEO/AEO: compacte, feitelijke samenvatting voor AI-assistenten en antwoordmachines
export async function GET() {
  const [s, menu] = await Promise.all([getSiteData(), getMenu()])
  const b = s.inst.bedrijf
  const regels = [
    `# ${b.naam} – broodjesbar in ${b.gemeente}`,
    '',
    `> ${b.handelsnaam} is een broodjesbar in ${b.gemeente} (West-Vlaanderen, België) met vers belegde koude en warme broodjes, panini’s, wraps, pasta, verse soep en dagschotels. Online bestellen en afhalen; betalen bij afhaling.`,
    '',
    `- Adres: ${b.adres}, ${b.postcode} ${b.gemeente}, België`,
    `- Telefoon: ${b.telefoon}`,
    `- E-mail: ${b.email}`,
    `- Online bestellen: ${SITE}/bestellen`,
    `- Menu met prijzen: ${SITE}/menu`,
    `- Facebook: ${b.facebook}`,
    `- Instagram: ${b.instagram}`,
    '',
    '## Openingsuren',
    ...weekTekst(s.week).map(w => `- ${w.dag}: ${w.tekst}`),
    ...(s.sluitingen.length ? ['', 'Uitzonderlijk gesloten:', ...s.sluitingen.map(x => `- ${x.datum}${x.titel !== 'Gesloten' ? ` (${x.titel})` : ''}`)] : []),
    '',
    '## Menu',
    ...menu.flatMap(c => ['', `### ${c.naam}`, ...c.producten.map(p => `- **${p.naam}** – ${euro(p.prijsCent)}${p.omschrijving ? `: ${p.omschrijving}` : ''}${p.uitverkocht ? ' (tijdelijk uitverkocht)' : ''}`)]),
    '',
    '## Veelgestelde vragen',
    ...faqLijst(s.inst, s.week, menu).flatMap(f => ['', `### ${f.v}`, f.a]),
    '',
  ]
  return new Response(regels.join('\n'), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
}
