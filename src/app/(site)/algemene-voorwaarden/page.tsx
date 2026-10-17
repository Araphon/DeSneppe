import type { Metadata } from 'next'
import Link from 'next/link'
import { getInstellingen } from '@/lib/instellingen'
import { euro } from '@/lib/geld'

export const revalidate = 300
export const metadata: Metadata = { title: 'Algemene voorwaarden', alternates: { canonical: '/algemene-voorwaarden' } }

function Art({ nr, titel, children }: { nr: number; titel: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 font-display text-xl font-bold">Artikel {nr} – {titel}</h2>
      <div className="space-y-3 leading-relaxed text-ink/80">{children}</div>
    </section>
  )
}

export default async function Voorwaarden() {
  const { bedrijf: b, betalen } = await getInstellingen()
  const kbo = b.btwNummer.replace(/^BE/, '').replace(/(\d{4})(\d{3})(\d{3})/, '$1.$2.$3')
  return (
    <article className="container-x max-w-3xl py-14">
      <h1 className="h-display text-4xl">Algemene voorwaarden</h1>
      <p className="mt-2 text-sm text-ink/50">Online bestellen bij {b.naam} · versie oktober 2026</p>

      <div className="mt-8">
        <Art nr={1} titel="Wie zijn wij?">
          <p>Deze website wordt uitgebaat door <strong>{b.handelsnaam}</strong>, {b.adres}, {b.postcode} {b.gemeente}, België, ingeschreven in de Kruispuntbank van Ondernemingen onder nummer {kbo} (btw {b.btwNummer}).</p>
          <p>Je bereikt ons via <a className="underline" href={`tel:${b.telefoon.replace(/\s/g, '')}`}>{b.telefoon}</a> of <a className="underline" href={`mailto:${b.email}`}>{b.email}</a>.</p>
        </Art>

        <Art nr={2} titel="Toepassing">
          <p>Deze voorwaarden gelden voor elke bestelling die je plaatst via deze website of onze app. Door een bestelling te plaatsen, bevestig je dat je deze voorwaarden gelezen hebt en aanvaardt. Voor aankopen rechtstreeks aan de toog in onze zaak gelden ze niet.</p>
          <p>We kunnen deze voorwaarden aanpassen. Op je bestelling is altijd de versie van toepassing die gold op het moment dat je bestelde.</p>
        </Art>

        <Art nr={3} titel="Ons aanbod en de prijzen">
          <p>Alle prijzen zijn in euro en inclusief btw. Foto’s zijn ter illustratie; de samenstelling en presentatie kunnen licht afwijken. Producten kunnen tijdelijk uitverkocht of enkel op bepaalde dagen of uren beschikbaar zijn; dat staat dan duidelijk bij het product.</p>
          <p>Kennelijke vergissingen in prijs of omschrijving binden ons niet. Merken we zo’n vergissing na je bestelling, dan nemen we contact met je op voor we je bestelling klaarmaken.</p>
          {betalen.servicekostActief && betalen.transactiekostCent > 0 && <p>Voor online bestellingen{betalen.transactiekostOnderCent > 0 ? ` onder ${euro(betalen.transactiekostOnderCent)}` : ''} rekenen we een {betalen.transactiekostLabel.toLowerCase()} van {euro(betalen.transactiekostCent)} aan, ongeacht hoe je betaalt. Die zie je altijd vóór je de bestelling bevestigt.</p>}
        </Art>

        <Art nr={4} titel="Een bestelling plaatsen">
          <p>Om te bestellen maak je een gratis klantenaccount aan. Je zorgt ervoor dat je gegevens juist zijn en dat je je wachtwoord geheim houdt.</p>
          <p>Bij het afrekenen kies je een dag en een afhaalmoment. Per afhaalmoment kunnen we maar een beperkt aantal bestellingen voorzien; een volzet moment kan je niet meer kiezen.</p>
          <p>Je bestelling is definitief zodra je een bevestiging ziet en per e-mail ontvangt. Kies je voor online betalen, dan is je bestelling pas definitief nadat de betaling gelukt is.</p>
          <p>Zorg dat we je na het bestellen kunnen bereiken op het telefoonnummer en e-mailadres van je account, bijvoorbeeld als een product toch niet beschikbaar is. Kloppen je gegevens niet, laat het ons dan meteen weten.</p>
          <p>We mogen een bestelling weigeren of annuleren bij overmacht, bij een kennelijke vergissing, als je onbereikbaar bent of foute contactgegevens opgaf, bij misbruik of vermoeden van fraude (bijvoorbeeld valse of geautomatiseerde bestellingen), of als je eerdere bestellingen niet hebt afgehaald (zie artikel 7).</p>
        </Art>

        <Art nr={5} titel="Betalen">
          <p>Afhankelijk van wat beschikbaar is, betaal je online bij het bestellen of aan de kassa bij het afhalen. Aan de kassa kan je ook elektronisch betalen.</p>
          <p>Online betalingen verlopen via onze betaaldienstverlener Mollie B.V. (Bancontact, betaalkaart, Apple Pay en andere methodes die we aanbieden). Wij ontvangen of bewaren je kaartgegevens niet.</p>
          <p>We rekenen nooit een toeslag aan omdat je elektronisch betaalt.</p>
        </Art>

        <Art nr={6} titel="Afhalen">
          <p>Je haalt je bestelling af op het gekozen moment in onze zaak, {b.adres}, {b.postcode} {b.gemeente}. We leveren niet aan huis. Je krijgt een bericht wanneer je bestelling klaar is; je mag dan meteen doorlopen naar de kassa.</p>
          <p>Kom je later dan afgesproken, dan bewaren we je bestelling tot sluitingstijd van die dag. Om voedselveiligheidsredenen kunnen we ze daarna niet meer meegeven.</p>
          <p>Kijk je bestelling bij het afhalen even na. Klopt er iets niet, meld het dan meteen aan de toog, zodat we het nog kunnen rechtzetten.</p>
          <p>Alcoholische dranken, zoals bier, geven we enkel mee aan personen van minstens 16 jaar. We kunnen daarom een identiteitsbewijs vragen. Kan je je leeftijd niet aantonen, dan geven we die producten niet mee en betaal je ze niet (of betalen we ze terug als je online betaalde).</p>
        </Art>

        <Art nr={7} titel="Niet afgehaalde bestellingen">
          <p>Een bestelling die niet wordt afgehaald, maken we voor niets klaar. Voor online betaalde bestellingen volgt in dat geval geen terugbetaling.</p>
          <p>Werd een bestelling met betaling aan de kassa meermaals niet afgehaald, dan kunnen we betalen bij afhalen voor jouw account uitschakelen; je kan dan enkel nog online betalen. Vergissingen kan je altijd met ons bespreken.</p>
        </Art>

        <Art nr={8} titel="Annuleren en herroepingsrecht">
          <p>Het wettelijke herroepingsrecht van 14 dagen geldt niet voor producten die we op maat of volgens jouw wensen klaarmaken, en ook niet voor voeding die snel bederft (artikel VI.53, 3° en 4° van het Wetboek van economisch recht). Dat zijn de meeste producten op onze kaart, zoals broodjes, soep, pasta en dagschotels.</p>
          <p>Voor andere producten, zoals een gesloten blikje of verpakte snoep, geldt het herroepingsrecht wél: je kan ze binnen 14 dagen na het afhalen ongeopend terugbrengen en krijgt dan je geld terug.</p>
          <p>Wil je toch annuleren? Bel ons dan zo snel mogelijk op {b.telefoon}. Zolang we nog niet aan je bestelling begonnen zijn, annuleren we ze kosteloos en betalen we een online betaling volledig terug.</p>
          <p>Moeten wij een bestelling annuleren (bijvoorbeeld door overmacht of omdat een product toch niet beschikbaar is), dan verwittigen we je en betalen we een online betaling volledig terug via hetzelfde betaalmiddel.</p>
        </Art>

        <Art nr={9} titel="Allergenen en voedselveiligheid">
          <p>Bij onze producten vermelden we de allergenen zo nauwkeurig mogelijk. Omdat alles in dezelfde keuken wordt bereid, kunnen we sporen van andere allergenen nooit volledig uitsluiten. Heb je een ernstige allergie of intolerantie, vermeld dat dan in je bestelling of bel ons vooraf.</p>
          <p>Onze producten zijn bedoeld om dezelfde dag te consumeren. Bewaar gekoelde producten in de koelkast.</p>
        </Art>

        <Art nr={10} titel="Spaarprogramma">
          <p>Met een klantenaccount spaar je punten op producten waar dat bij vermeld staat. Punten worden bijgeschreven zodra je bestelling klaar is en vervallen bij een annulatie.</p>
          <p>Met voldoende punten kan je een beloning verzilveren via een voucher met QR-code, die je aan de kassa toont. Punten en vouchers hebben geen geldwaarde, zijn persoonlijk en niet inwisselbaar voor geld. Verwijder je je account, dan vervallen je punten.</p>
          <p>We kunnen het spaarprogramma of de beloningen wijzigen of stopzetten. Dat kondigen we minstens 30 dagen vooraf aan, zodat je je punten nog kan gebruiken.</p>
        </Art>

        <Art nr={11} titel="Aansprakelijkheid">
          <p>We doen ons best om de website altijd goed te laten werken, maar kunnen niet garanderen dat ze nooit onderbroken is. We zijn niet aansprakelijk voor onrechtstreekse schade. Onze aansprakelijkheid is in elk geval beperkt tot het bedrag van de betrokken bestelling, behalve bij opzet of zware fout.</p>
          <p>Bij overmacht (zoals een stroompanne, technische storing of ziekte) kunnen we bestellingen annuleren zonder schadevergoeding; online betalingen betalen we dan terug.</p>
        </Art>

        <Art nr={12} titel="Privacy">
          <p>Hoe we met je persoonsgegevens omgaan, lees je in onze <Link className="underline" href="/privacy">privacyverklaring</Link>.</p>
        </Art>

        <Art nr={13} titel="Klachten en geschillen">
          <p>Niet tevreden? Laat het ons zo snel mogelijk weten via {b.email} of {b.telefoon}, dan zoeken we samen een oplossing.</p>
          <p>Komen we er samen niet uit, dan kan je terecht bij de Consumentenombudsdienst (<a className="underline" href="https://consumentenombudsdienst.be" target="_blank" rel="noopener">consumentenombudsdienst.be</a>) of via het Europese platform voor onlinegeschillenbeslechting (<a className="underline" href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>).</p>
          <p>Op deze voorwaarden is het Belgisch recht van toepassing. Bij een geschil zijn de rechtbanken bevoegd die de wet aanduidt.</p>
        </Art>
      </div>
    </article>
  )
}
