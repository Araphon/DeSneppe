import type { Metadata } from 'next'
import Link from 'next/link'
import { getInstellingen } from '@/lib/instellingen'

export const revalidate = 300
export const metadata: Metadata = { title: 'Account verwijderen', alternates: { canonical: '/account-verwijderen' } }

// Uitleg voor Google Play/App Store: hoe je je De Sneppe-account en gegevens laat verwijderen
export default async function AccountVerwijderen() {
  const { bedrijf: b } = await getInstellingen()
  return (
    <article className="container-x max-w-3xl py-14">
      <h1 className="h-display text-4xl">Je account verwijderen</h1>
      <p className="mt-3 text-ink/70">Je kan je account bij {b.handelsnaam} (website en app &quot;De Sneppe&quot;) op elk moment zelf verwijderen.</p>

      <section className="mt-8">
        <h2 className="mb-2 font-display text-xl font-bold">Zo verwijder je je account</h2>
        <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-ink/80">
          <li>Open de app De Sneppe of ga naar <Link className="underline" href="/account">onze website → Mijn account</Link> en meld je aan.</li>
          <li>Kies het tabblad <strong>Gegevens</strong>.</li>
          <li>Tik onderaan op <strong>Account verwijderen</strong> en bevestig.</li>
        </ol>
        <p className="mt-3 leading-relaxed text-ink/80">Lukt dat niet? Mail naar <a className="underline" href={`mailto:${b.email}`}>{b.email}</a> of bel {b.telefoon} vanaf het e-mailadres of telefoonnummer van je account. We verwijderen je account dan binnen 30 dagen.</p>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-display text-xl font-bold">Wat wordt verwijderd?</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-ink/80">
          <li>Je account: naam, e-mailadres, telefoonnummer, adres, geboortedatum en wachtwoord of koppeling met Google/Apple.</li>
          <li>Je spaarpunten, vouchers en meldingsvoorkeuren.</li>
          <li>De koppeling met je toestellen voor pushmeldingen.</li>
        </ul>
        <p className="mt-3 leading-relaxed text-ink/80">Dit gebeurt meteen en kan niet ongedaan gemaakt worden.</p>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-display text-xl font-bold">Wat blijft bewaard?</h2>
        <p className="leading-relaxed text-ink/80">Je vroegere bestellingen (producten, bedragen en datum) bewaren we voor onze boekhouding, zoals de wet vereist (tot 7 jaar). Ze worden losgekoppeld van je account en je naam, e-mailadres en telefoonnummer worden eruit gewist.</p>
        <p className="mt-3 leading-relaxed text-ink/80">Meer informatie vind je in onze <Link className="underline" href="/privacy">privacyverklaring</Link>.</p>
      </section>
    </article>
  )
}
