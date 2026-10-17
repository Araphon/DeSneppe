import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import Kaart from '@/components/Kaart'
import Tekst from '@/components/Tekst'
import { getInhoud } from '@/lib/inhoud'
import { breadcrumbJsonLd, getSiteData, statusTekst, telE164, weekTekst } from '@/lib/site'
import { formatDatumLang } from '@/lib/tijd'

export const revalidate = 60
export const metadata: Metadata = {
  title: 'Contact, adres & openingsuren',
  description: 'Contacteer broodjesbar De Sneppe: Bruggesteenweg 83, 8760 Meulebeke · 051 43 69 57 · info@de-sneppe.be. Open van maandag tot vrijdag vanaf 6 uur.',
  alternates: { canonical: '/contact' },
}

export default async function Contact() {
  const [s, t] = await Promise.all([getSiteData(), getInhoud()])
  const b = s.inst.bedrijf
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ naam: 'Contact', pad: '/contact' }])} />
      <section className="container-x py-14">
        <h1 className="h-display text-4xl sm:text-5xl">Contact</h1>
        <Tekst tekst={t['contact.intro']} className="mt-4 max-w-2xl text-lg text-ink/75" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="font-display text-xl font-bold">{b.handelsnaam}</h2>
              <address className="mt-2 not-italic leading-relaxed text-ink/80">{b.adres}<br />{b.postcode} {b.gemeente}</address>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`tel:${telE164(b.telefoon)}`} className="btn-ink btn-sm">📞 {b.telefoon}</a>
                <a href={`mailto:${b.email}`} className="btn-ghost btn-sm">✉️ {b.email}</a>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${b.adres}, ${b.postcode} ${b.gemeente}`)}`} target="_blank" rel="noopener" className="btn-ghost btn-sm">🧭 Route</a>
              </div>
            </div>
            <div className="card p-6">
              <h2 className="font-display text-xl font-bold">Openingsuren</h2>
              <p className={`mt-1 text-sm font-medium ${s.nuOpen ? 'text-emerald-700' : 'text-ink/60'}`}>● {statusTekst(s)}</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
                {weekTekst(s.week).map(w => (<div key={w.dag} className="contents"><dt className="capitalize">{w.dag}</dt><dd className={w.tekst === 'gesloten' ? 'text-ink/50' : 'font-medium'}>{w.tekst}</dd></div>))}
              </dl>
              {s.sluitingen.length > 0 && (
                <div className="mt-4 rounded-xl bg-brand-light p-3 text-sm">
                  <p className="font-semibold">Uitzonderlijk gesloten</p>
                  <ul>{s.sluitingen.slice(0, 6).map(x => <li key={x.datum} className="capitalize">{formatDatumLang(x.datum)}{x.titel !== 'Gesloten' ? ` – ${x.titel}` : ''}</li>)}</ul>
                </div>
              )}
            </div>
            <div className="card p-6 text-ink/80"><Tekst tekst={t['contact.parkeren']} /></div>
          </div>
          <div><Kaart lat={b.lat} lng={b.lng} titel="Kaart De Sneppe Meulebeke" /></div>
        </div>
      </section>
    </>
  )
}
