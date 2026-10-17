import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { Labels } from '@/components/ProductTegel'
import { getMenu } from '@/lib/catalogus'
import { euro } from '@/lib/geld'
import { breadcrumbJsonLd, menuJsonLd } from '@/lib/site'

export const revalidate = 60
export const metadata: Metadata = {
  title: 'Menu & prijzen – broodjes, panini’s, pasta',
  description: 'Bekijk het volledige menu van broodjesbar De Sneppe in Meulebeke: belegde en warme broodjes, panini’s, wraps, pasta, soep, dagschotels en dranken, met prijzen.',
  alternates: { canonical: '/menu' },
}

export default async function MenuPagina() {
  const menu = await getMenu()
  return (
    <>
      <JsonLd data={[menuJsonLd(menu), breadcrumbJsonLd([{ naam: 'Menu', pad: '/menu' }])]} />
      <section className="bg-ink text-white">
        <div className="container-x py-12">
          <h1 className="h-display text-4xl sm:text-5xl">Ons menu</h1>
          <p className="mt-3 max-w-2xl text-white/75">Alle broodjes worden vers belegd. Bij de meeste broodjes kan je kiezen voor bruin brood, zonder groenten of andere aanpassingen — dat doe je eenvoudig bij het online bestellen.</p>
          <nav className="no-scrollbar mt-6 flex gap-2 overflow-x-auto" aria-label="Categorieën">
            {menu.map(c => <a key={c.id} href={`#${c.slug}`} className="shrink-0 rounded-md border border-white/20 px-4 py-1.5 text-sm hover:bg-white/10">{c.naam}</a>)}
          </nav>
        </div>
      </section>
      <div className="container-x mt-10 space-y-14">
        {menu.map(c => (
          <section key={c.id} id={c.slug} className="scroll-mt-24">
            <h2 className="h-display mb-5 border-b border-ink/10 pb-2 text-3xl">{c.naam}</h2>
            {c.omschrijving && <p className="-mt-2 mb-5 text-ink/70">{c.omschrijving}</p>}
            <ul className="grid gap-x-10 gap-y-5 md:grid-cols-2">
              {c.producten.map(p => (
                <li key={p.id} className="flex gap-4">
                  {p.afbeelding && <Image src={p.afbeelding} alt={p.naam} width={72} height={72} className={`h-[72px] w-[72px] shrink-0 rounded-xl object-cover ${p.uitverkocht ? 'grayscale opacity-60' : ''}`} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-3">
                      <h3 className="font-semibold">{p.naam}<Labels labels={p.labels} size={16} /></h3>
                      <span className="flex-1 border-b border-dotted border-ink/25" />
                      <span className="font-semibold">{euro(p.prijsCent)}</span>
                    </div>
                    {p.omschrijving && <p className="text-sm text-ink/65">{p.omschrijving}</p>}
                    {p.beschikbaarBadge && <p className="text-xs font-semibold text-ink/60">🕒 {p.beschikbaarBadge}</p>}
                    {p.uitverkocht && <p className="text-xs font-semibold uppercase text-brand-dark">Tijdelijk uitverkocht</p>}
                    {p.allergenenActief && (p.allergenenLijst.length > 0 || p.allergenen) && <p className="mt-0.5 text-xs text-ink/50">Allergenen: {[p.allergenenLijst.filter(a => a.soort === 'BEVAT').map(a => a.naam).join(', '), p.allergenenLijst.some(a => a.soort === 'SPOREN') ? `sporen van ${p.allergenenLijst.filter(a => a.soort === 'SPOREN').map(a => a.naam.toLowerCase()).join(', ')}` : '', p.allergenen || ''].filter(Boolean).join(' · ')}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="card flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold">Zin gekregen?</h2>
            <p className="text-ink/70">Bestel online, kies je afhaalmoment en betaal bij het afhalen.</p>
          </div>
          <Link href="/bestellen" className="btn-brand px-7 py-3">Bestel online</Link>
        </div>
        <p className="text-sm text-ink/60">Heb je een allergie of intolerantie? Vraag gerust naar de allergeneninformatie in de zaak.</p>
      </div>
    </>
  )
}
