'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MenuCategorie, MenuProduct } from '@/lib/catalogus'
import { euro } from '@/lib/geld'
import ProductTegel from './ProductTegel'
import ProductModal from './ProductModal'
import Mandje from './Mandje'
import { useWinkelmand } from './winkelmand'
import { mogelijkeAllergenen } from '@/lib/allergenen'
import HerbestelKnop from './HerbestelKnop'
import { vraag } from './fetcher'

export default function Shop({ menu: start, banner, bestellenActief }: { menu: MenuCategorie[]; banner: string; bestellenActief: boolean }) {
  const [menu, setMenu] = useState(start)
  const [actief, setActief] = useState<MenuProduct | null>(null)
  const [zoek, setZoek] = useState('')
  const [mandOpen, setMandOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [huidigeCat, setHuidigeCat] = useState(start[0]?.slug)
  const [zonder, setZonder] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [vorige, setVorige] = useState<{ id: string; afhaalTijd: string; totaalCent: number; status: string; betaalStatus: string; regels: { productNaam: string; aantal: number }[] }[]>([])
  useEffect(() => {
    vraag<{ klant: unknown }>('/api/klant/profiel').then(r => r.klant && vraag<typeof vorige>('/api/klant/bestellingen').then(l => {
      // unieke combinaties, laatste 3 (zonder geannuleerde)
      const gezien = new Set<string>()
      setVorige(l.filter(b => b.status !== 'GEANNULEERD').filter(b => { const k = b.regels.map(r => `${r.aantal}${r.productNaam}`).sort().join('|'); if (gezien.has(k)) return false; gezien.add(k); return true }).slice(0, 3))
    })).catch(() => {})
  }, [])
  const { voegToe, aantal, totaalCent } = useWinkelmand()
  const navRef = useRef<HTMLDivElement>(null)

  // Voorraad (uitverkocht) elke minuut verversen
  useEffect(() => {
    const t = setInterval(async () => {
      try { const r = await fetch('/api/menu', { cache: 'no-store' }); if (r.ok) setMenu(await r.json()) } catch {}
    }, 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      const zichtbaar = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (zichtbaar) setHuidigeCat(zichtbaar.target.id.replace('cat-', ''))
    }, { rootMargin: '-140px 0px -60% 0px' })
    document.querySelectorAll('[id^="cat-"]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [menu, zoek])

  useEffect(() => {
    const el = navRef.current?.querySelector(`[data-cat="${huidigeCat}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [huidigeCat])

  const alleAllergenen = useMemo(() => {
    const m = new Map<string, { id: string; naam: string; icoon: string | null }>()
    menu.flatMap(c => c.producten).forEach(p => { p.allergenenLijst.forEach(a => m.set(a.id, a)); p.opties.forEach(o => o.keuzes.forEach(k => k.allergenenLijst.forEach(a => m.set(a.id, a)))) })
    return Array.from(m.values()).sort((a, b) => a.naam.localeCompare(b.naam))
  }, [menu])
  const allergieVan = (p: MenuProduct) => {
    if (!zonder.size) return undefined
    if (!p.allergenenActief) return { bevat: [], onbekend: true }
    const ids = mogelijkeAllergenen(p)
    return { bevat: alleAllergenen.filter(a => zonder.has(a.id) && ids.has(a.id)).map(a => a.naam), onbekend: false }
  }

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    if (!q) return menu
    return menu.map(c => ({ ...c, producten: c.producten.filter(p => `${p.naam} ${p.omschrijving || ''}`.toLowerCase().includes(q)) })).filter(c => c.producten.length)
  }, [menu, zoek])

  return (
    <div className="container-x grid gap-8 pb-28 pt-6 lg:grid-cols-[1fr_340px] lg:pb-10">
      <div className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="h-display text-3xl sm:text-4xl">Online bestellen</h1>
            <p className="text-ink/70">{banner}</p>
          </div>
          <div className="flex gap-2 sm:max-w-sm">
            <input type="search" value={zoek} onChange={e => setZoek(e.target.value)} placeholder="Zoek een product…" className="input" aria-label="Zoeken" />
            {alleAllergenen.length > 0 && <button onClick={() => setFilterOpen(v => !v)} className={`btn btn-sm shrink-0 border ${zonder.size ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white'}`} aria-expanded={filterOpen}>Allergieën{zonder.size ? ` (${zonder.size})` : ''}</button>}
          </div>
        </div>
        {vorige.length > 0 && !zoek && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold text-ink/70">Snel opnieuw bestellen</p>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {vorige.map(b => (
                <div key={b.id} className="card w-64 shrink-0 p-3">
                  <p className="line-clamp-2 text-sm font-semibold">{b.regels.map(r => `${r.aantal}× ${r.productNaam}`).join(', ')}</p>
                  <p className="mb-2 mt-1 text-xs text-ink/50">{new Intl.DateTimeFormat('nl-BE', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'short' }).format(new Date(b.afhaalTijd))} · {euro(b.totaalCent)}</p>
                  <HerbestelKnop id={b.id} klein />
                </div>
              ))}
            </div>
          </div>
        )}
        {filterOpen && (
          <div className="card mb-4 p-4">
            <p className="mb-2 text-sm font-semibold">Ik wil geen:</p>
            <div className="flex flex-wrap gap-2">
              {alleAllergenen.map(a => {
                const aan = zonder.has(a.id)
                return <button key={a.id} onClick={() => setZonder(z => { const n = new Set(z); if (aan) n.delete(a.id); else n.add(a.id); return n })} className={`rounded-md border px-2.5 py-1 text-sm ${aan ? 'border-red-600 bg-red-50 font-semibold text-red-700' : 'border-ink/15 bg-white'}`}>{a.icoon} {a.naam}</button>
              })}
            </div>
            <p className="mt-3 text-xs text-ink/50">Producten met deze allergenen worden uitgegrijsd. Alles wordt in dezelfde keuken bereid: sporen zijn nooit volledig uit te sluiten. Bij een ernstige allergie: vraag het ons.</p>
            {zonder.size > 0 && <button className="mt-2 text-sm underline" onClick={() => setZonder(new Set())}>Filter wissen</button>}
          </div>
        )}
        {!bestellenActief && <div className="mb-4 rounded-xl bg-brand-light p-4 font-medium">Online bestellen is momenteel niet mogelijk. Je kan het menu wel bekijken.</div>}

        <div ref={navRef} className="no-scrollbar sticky top-16 z-30 -mx-4 flex gap-2 overflow-x-auto border-b border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
          {gefilterd.map(c => (
            <a key={c.id} data-cat={c.slug} href={`#cat-${c.slug}`} className={`shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition ${huidigeCat === c.slug ? 'bg-ink text-white' : 'bg-white hover:bg-sand'}`}>{c.naam}</a>
          ))}
        </div>

        {gefilterd.length === 0 && <p className="py-16 text-center text-ink/50">Niets gevonden voor “{zoek}”.</p>}
        {gefilterd.map(c => (
          <section key={c.id} id={`cat-${c.slug}`} className="scroll-mt-32 pt-8">
            <h2 className="h-display mb-4 text-2xl">{c.naam}</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
              {c.producten.map(p => (
                <ProductTegel key={p.id} p={p} allergie={allergieVan(p)} onClick={bestellenActief ? () => setActief(p) : undefined} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="hidden lg:block">
        <div className="card sticky top-20 h-[calc(100vh-6rem)] overflow-hidden"><Mandje /></div>
      </aside>

      {aantal > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 lg:hidden">
          <button onClick={() => setMandOpen(true)} className="btn-brand w-full justify-between py-3.5 text-base shadow-xl">
            <span className="grid h-7 min-w-7 place-items-center rounded-full bg-white/25 px-2 text-sm">{aantal}</span>
            <span>Bekijk bestelling</span>
            <span>{euro(totaalCent)}</span>
          </button>
        </div>
      )}
      {mandOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMandOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 h-[85vh] rounded-t-3xl bg-white" onClick={e => e.stopPropagation()}>
            <Mandje onSluit={() => setMandOpen(false)} />
          </div>
        </div>
      )}

      {actief && (
        <ProductModal
          p={actief}
          onSluit={() => setActief(null)}
          onToevoegen={r => {
            voegToe({ productId: actief.id, naam: actief.naam, afbeelding: actief.afbeelding, ...r })
            setToast(`${r.aantal}× ${actief.naam} toegevoegd`)
            setActief(null)
            setTimeout(() => setToast(''), 2200)
          }}
        />
      )}
      {toast && <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-xl" role="status">✓ {toast}</div>}
    </div>
  )
}
