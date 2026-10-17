import type { Metadata } from 'next'
import Link from 'next/link'
import { getInstellingen } from '@/lib/instellingen'

export const revalidate = 300
export const metadata: Metadata = { title: 'Privacyverklaring', alternates: { canonical: '/privacy' } }

function Blok({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 font-display text-xl font-bold">{titel}</h2>
      <div className="space-y-3 leading-relaxed text-ink/80">{children}</div>
    </section>
  )
}

export default async function Privacy() {
  const { bedrijf: b } = await getInstellingen()
  return (
    <article className="container-x max-w-3xl py-14">
      <h1 className="h-display text-4xl">Privacyverklaring</h1>
      <p className="mt-2 text-sm text-ink/50">Versie oktober 2026</p>
      <div className="mt-8">
        <Blok titel="Wie is verantwoordelijk?">
          <p><strong>{b.handelsnaam}</strong>, {b.adres}, {b.postcode} {b.gemeente} (btw {b.btwNummer}) is verantwoordelijk voor de verwerking van je persoonsgegevens via deze website en onze app. Vragen? Mail naar <a className="underline" href={`mailto:${b.email}`}>{b.email}</a> of bel {b.telefoon}.</p>
        </Blok>

        <Blok titel="Welke gegevens verwerken we, en waarom?">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Je account en bestellingen</strong> – naam, voornaam, adres, postcode, gemeente, telefoonnummer, e-mailadres, je bestellingen en afhaalmomenten. Nodig om je bestelling te verwerken, je te verwittigen wanneer ze klaar is en je bestelhistoriek te tonen. <em>Rechtsgrond: uitvoering van de overeenkomst.</em></li>
            <li><strong>Geboortedatum</strong> – om je op je verjaardag te verrassen (bv. met een korting), enkel als je daarvoor kiest. <em>Rechtsgrond: toestemming.</em></li>
            <li><strong>Spaarpunten en vouchers</strong> – je puntensaldo en ingewisselde beloningen. <em>Rechtsgrond: uitvoering van de overeenkomst.</em></li>
            <li><strong>Betalingen</strong> – bij online betalen verwerkt onze betaaldienstverlener Mollie je betaalgegevens. Wij krijgen enkel te zien óf en hoeveel er betaald is, nooit je kaart- of rekeninggegevens. <em>Rechtsgrond: uitvoering van de overeenkomst en wettelijke boekhoudplicht.</em></li>
            <li><strong>Nieuws, acties en herinneringen</strong> – e-mails of pushberichten over nieuwe broodjes, acties of “we missen je”, enkel over de onderwerpen die je zelf aanvinkt. <em>Rechtsgrond: toestemming, die je altijd kan intrekken.</em></li>
            <li><strong>Vraag om een review</strong> – na een afgehaalde bestelling kunnen we je één keer vragen om een beoordeling. <em>Rechtsgrond: gerechtvaardigd belang; je kan dit uitzetten in je account.</em></li>
            <li><strong>Beveiliging en misbruik</strong> – technische gegevens zoals IP-adres en tijdstip van aanmelden of bestellen, om valse bestellingen en misbruik tegen te gaan. Ook niet-afgehaalde bestellingen houden we bij. <em>Rechtsgrond: gerechtvaardigd belang.</em></li>
          </ul>
        </Blok>

        <Blok titel="Met wie delen we je gegevens?">
          <p>We verkopen je gegevens nooit. We delen ze enkel met dienstverleners die we nodig hebben, en die ze uitsluitend voor ons mogen gebruiken:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>onze hostingpartner, waar de website en de database draaien (servers in de Europese Unie);</li>
            <li>Mollie B.V. (Nederland) voor online betalingen;</li>
            <li>onze e-mailprovider voor het versturen van bevestigingen en berichten;</li>
            <li>bij aanmelden met Google, Apple of Microsoft: die partij, enkel om je identiteit te bevestigen;</li>
            <li>onze boekhouder en, als de wet dat oplegt, overheidsdiensten.</li>
          </ul>
        </Blok>

        <Blok titel="Hoe lang bewaren we je gegevens?">
          <ul className="list-disc space-y-1 pl-5">
            <li>Je account: zolang je het gebruikt. Na 3 jaar zonder bestelling of aanmelding verwijderen we het.</li>
            <li>Bestellingen en betalingen: 7 jaar, omdat de boekhoudwetgeving dat oplegt. Verwijder je je account, dan anonimiseren we je bestellingen (je naam en contactgegevens worden gewist).</li>
            <li>Technische logs voor beveiliging: maximaal 12 maanden.</li>
          </ul>
        </Blok>

        <Blok titel="Jouw rechten">
          <p>Je hebt het recht om je gegevens in te kijken, te verbeteren, te laten wissen of over te dragen, om je tegen een verwerking te verzetten of ze te laten beperken, en om je toestemming in te trekken.</p>
          <p>Veel kan je zelf in <Link className="underline" href="/account">je account</Link>: je gegevens aanpassen, je meldingsvoorkeuren kiezen en je account volledig verwijderen. Voor de rest mail je naar {b.email}; we antwoorden binnen de maand.</p>
          <p>Ben je niet tevreden over hoe we met je gegevens omgaan, dan kan je klacht indienen bij de Gegevensbeschermingsautoriteit, Drukpersstraat 35, 1000 Brussel (<a className="underline" href="https://www.gegevensbeschermingsautoriteit.be" target="_blank" rel="noopener">gegevensbeschermingsautoriteit.be</a>).</p>
        </Blok>

        <Blok titel="Cookies">
          <p>We gebruiken enkel functionele cookies en lokale opslag die nodig zijn om de website te laten werken: om je aangemeld te houden en je winkelmandje te onthouden. We plaatsen geen tracking-, advertentie- of analysecookies van derden. Daarom vragen we ook geen cookietoestemming.</p>
        </Blok>

        <Blok titel="Beveiliging">
          <p>Je gegevens worden versleuteld verstuurd (https), wachtwoorden worden nooit leesbaar bewaard en enkel bevoegde personen hebben toegang tot het beheer.</p>
        </Blok>
      </div>
    </article>
  )
}
