import Image from 'next/image'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import Faq from '@/components/Faq'
import Kaart from '@/components/Kaart'
import ProductTegel from '@/components/ProductTegel'
import Carrousel from '@/components/Carrousel'
import { getMenu } from '@/lib/catalogus'
import { fotoLijst, getInhoud } from '@/lib/inhoud'
import { faqJsonLd, faqLijst, getSiteData, statusTekst, weekTekst } from '@/lib/site'
import { formatDatumLang } from '@/lib/tijd'
import { euro } from '@/lib/geld'

export const revalidate = 60

export default async function Home() {
  const [s, menu, t] = await Promise.all([getSiteData(), getMenu(), getInhoud()])
  const faq = faqLijst(s.inst, s.week, menu)
  const alle = menu.flatMap(c => c.producten)
  // Hero: één foto per categorie, liefst broodjes/panini/wraps/pasta (geen dranken of potjes)
  const gezien = new Set<string>()
  const uitgelicht = menu
    .filter(c => !/drank|mee te nemen/i.test(c.naam))
    .sort((a, b) => Number(/belegde/i.test(a.naam)) - Number(/belegde/i.test(b.naam)))
    .map(c => c.producten.find(p => p.afbeelding && !p.uitverkocht && !gezien.has(p.afbeelding)))
    .filter((p): p is NonNullable<typeof p> => { if (!p) return false; gezien.add(p.afbeelding!); return true })
    .slice(0, 4)
  const gekozen = fotoLijst(t['home.fotos'])
  const heroFotos = gekozen.length ? gekozen.map((src, i) => ({ id: `f${i}`, afbeelding: src, naam: 'De Sneppe' })) : uitgelicht
  const broodjes = menu.find(c => /belegde/i.test(c.naam))?.producten.filter(p => !p.uitverkocht).slice(0, 8) || []
  const strook = fotoLijst(t['home.strook.fotos'])
  const schotels = fotoLijst(t['home.schotels.fotos'])
  const automaat = fotoLijst(t['home.automaat.fotos'])[0]
  const b = s.inst.bedrijf
  const alineas = (x: string) => x.split(/\n\s*\n/).map((a, i) => <p key={i} className="mt-3 text-ink/75 first:mt-0">{a}</p>)
  return (
    <>
      <JsonLd data={faqJsonLd(faq)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="container-x grid items-center gap-10 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div>
            <p className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${s.nuOpen ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/70'}`}>
              <span className={`h-2 w-2 rounded-full ${s.nuOpen ? 'bg-emerald-400 animate-pulse' : 'bg-white/50'}`} />{statusTekst(s)}
            </p>
            <h1 className="h-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">{t['home.titel']}</h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">{t['home.intro']}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/bestellen" className="btn-brand px-7 py-3.5 text-lg">Bestel online</Link>
              <Link href="/menu" className="btn border border-white/25 px-7 py-3.5 text-lg hover:bg-white/10">Bekijk het menu</Link>
            </div>
            {s.sluitingen[0] && (
              <p className="mt-6 text-sm text-mustard">Let op: gesloten op {formatDatumLang(s.sluitingen[0].datum)}{s.sluitingen[0].titel !== 'Gesloten' ? ` (${s.sluitingen[0].titel})` : ''}.</p>
            )}
          </div>
          <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-3">
            {heroFotos.map((p, i) => (
              <div key={p.id} className={`relative aspect-square overflow-hidden rounded-lg ${i % 2 ? 'translate-y-6' : ''}`}>
                <Image src={p.afbeelding!} alt={p.naam} fill sizes="(max-width: 768px) 45vw, 240px" className="object-cover" priority={i < 2} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Troeven */}
      <section className="container-x -mt-6 grid gap-4 sm:grid-cols-3 relative z-10">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-6">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-brand-light text-brand-dark">
              {i === 1 && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 21c0-9 5-15 15-16-1 10-7 15-15 16z"/><path d="M5 21l8-8"/></svg>}
              {i === 2 && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M11 18h2"/></svg>}
              {i === 3 && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>}
            </div>
            <h2 className="font-display text-xl font-bold">{t[`home.usp${i}.titel`]}</h2>
            <p className="mt-1 text-ink/70">{t[`home.usp${i}.tekst`]}</p>
          </div>
        ))}
      </section>

      {/* Fotostrook */}
      {strook.length > 0 && (
        <section className="mt-16">
          <div className="container-x"><h2 className="h-display text-3xl">{t['home.strook.titel']}</h2></div>
          <div className="container-x mt-6"><Carrousel label={t['home.strook.titel']}>
            {strook.map((src, i) => (
              <div key={src + i} className="relative h-72 w-56 shrink-0 snap-start overflow-hidden rounded-lg bg-sand sm:h-80 sm:w-64">
                <Image src={src} alt={`${t['home.strook.titel']} – foto ${i + 1}`} fill sizes="256px" className="object-cover" />
              </div>
            ))}
          </Carrousel></div>
        </section>
      )}

      {/* Categorieën */}
      <section className="container-x mt-16">
        <h2 className="h-display text-3xl">Wat mag het zijn?</h2>
        <p className="mt-1 text-ink/70">{alle.length} producten, van een klassieke smos tot een warme panini.</p>
        <div className="mt-6"><Carrousel label="Categorieën">
          {menu.map(c => {
            const img = c.producten.find(p => p.afbeelding)?.afbeelding
            const vanaf = Math.min(...c.producten.map(p => p.prijsCent))
            return (
              <Link key={c.id} href={`/menu#${c.slug}`} className="group relative h-40 w-40 shrink-0 snap-start overflow-hidden rounded-lg bg-ink sm:h-48 sm:w-48">
                {img && <Image src={img} alt="" fill sizes="200px" className="object-cover opacity-70 transition group-hover:scale-105 group-hover:opacity-60" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 p-3 text-white">
                  <h3 className="font-display text-lg font-bold leading-tight">{c.naam}</h3>
                  <p className="text-xs text-white/75">vanaf {euro(vanaf)}</p>
                </div>
              </Link>
            )
          })}
        </Carrousel></div>
      </section>

      {/* Populaire broodjes */}
      {broodjes.length > 0 && (
        <section className="container-x mt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="h-display text-3xl">Belegde broodjes</h2>
            <Link href="/bestellen#cat-belegde-broodjes" className="font-semibold text-brand-dark hover:underline">Alle belegde broodjes →</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {broodjes.map(p => <Link key={p.id} href="/bestellen#cat-belegde-broodjes"><ProductTegel p={p} /></Link>)}
          </div>
        </section>
      )}

      {/* Schotels & feestbroodjes */}
      {schotels.length > 0 && (
        <section className="container-x mt-20 grid items-center gap-10 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            {schotels.slice(0, 3).map((src, i) => (
              <div key={src + i} className={`relative overflow-hidden rounded-lg bg-sand ${i === 0 ? 'col-span-2 aspect-[16/10]' : 'aspect-square'}`}>
                <Image src={src} alt={`${t['home.schotels.titel']} – foto ${i + 1}`} fill sizes="(max-width: 1024px) 90vw, 560px" className="object-cover" />
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-dark">Voor bedrijven & feestjes</p>
            <h2 className="h-display mt-1 text-3xl sm:text-4xl">{t['home.schotels.titel']}</h2>
            <div className="mt-4">{alineas(t['home.schotels.tekst'])}</div>
            <div className="mt-6 flex flex-wrap gap-3">
              {b.telefoon && <a href={`tel:${b.telefoon.replace(/[^+\d]/g, '')}`} className="btn-ink">Bel {b.telefoon}</a>}
              {b.email && <a href={`mailto:${b.email}?subject=${encodeURIComponent('Schotels / feestbroodjes')}`} className="btn-ghost">Mail ons</a>}
            </div>
          </div>
        </section>
      )}

      {/* Broodjesautomaat 24/7 */}
      {automaat && (
        <section className="container-x mt-20">
          <div className="grid overflow-hidden rounded-xl bg-ink text-white md:grid-cols-[2fr_3fr]">
            <div className="relative min-h-72 md:min-h-full">
              <Image src={automaat} alt="Broodjesautomaat van De Sneppe in Meulebeke" fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover" />
            </div>
            <div className="p-8 sm:p-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1 text-sm font-bold text-ink">24/7 open</span>
              <h2 className="h-display mt-4 text-3xl sm:text-4xl">{t['home.automaat.titel']}</h2>
              <div className="mt-4 [&_p]:text-white/75">{alineas(t['home.automaat.tekst'])}</div>
              <p className="mt-6 text-sm text-white/60">{b.adres}, {b.postcode} {b.gemeente}</p>
            </div>
          </div>
        </section>
      )}

      {/* FAQ + locatie */}
      <section className="container-x mt-20 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="h-display text-3xl">Veelgestelde vragen</h2>
          <div className="mt-6"><Faq faq={faq} /></div>
        </div>
        <div>
          <h2 className="h-display text-3xl">Kom langs</h2>
          <p className="mt-2 text-ink/70">{s.inst.bedrijf.adres}, {s.inst.bedrijf.postcode} {s.inst.bedrijf.gemeente}</p>
          <div className="mt-6"><Kaart lat={s.inst.bedrijf.lat} lng={s.inst.bedrijf.lng} titel="Kaart De Sneppe Meulebeke" /></div>
          <dl className="card mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 p-5 text-sm">
            {weekTekst(s.week).map(w => (<div key={w.dag} className="contents"><dt className="capitalize font-medium">{w.dag}</dt><dd className={w.tekst === 'gesloten' ? 'text-ink/50' : ''}>{w.tekst}</dd></div>))}
          </dl>
        </div>
      </section>
    </>
  )
}
