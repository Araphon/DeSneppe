'use client'
import { useEffect, useMemo, useState } from 'react'
import { vraag } from '@/components/fetcher'
import { PaginaKop } from '@/components/admin/ui'
import { Heatmap, Lijngrafiek, Staven } from '@/components/admin/grafieken'
import { euro } from '@/lib/geld'

type Kpi = { omzetCent: number; omzetExclCent: number; bestellingen: number; gemiddeldCent: number; stuks: number; klanten: number; nieuweKlanten: number; terugkerendPct: number; onlinePct: number; noShows: number; annulaties: number }
type Rapport = {
  van: string; tot: string; vergelijkVan: string | null; vergelijkTot: string | null; granulariteit: 'uur' | 'dag' | 'week' | 'maand'
  kpi: Kpi; vorigKpi: Kpi | null
  reeks: { sleutel: string; omzetCent: number; bestellingen: number; vorigOmzetCent: number | null; vorigBestellingen: number | null }[]
  heatmap: number[][]
  producten: { naam: string; categorie: string; aantal: number; omzetCent: number; vorigAantal: number; vorigOmzetCent: number }[]
  categorieen: { naam: string; omzetCent: number; aantal: number; vorigOmzetCent: number }[]
  aanpassingen: { naam: string; aantal: number }[]
  opties: { naam: string; aantal: number }[]
}

const vandaag = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())
const plus = (d: string, n: number) => { const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10) }
const wd = (d: string) => { const w = new Date(d + 'T12:00:00Z').getUTCDay(); return w === 0 ? 7 : w }
const maandStart = (d: string) => d.slice(0, 8) + '01'
const maandEind = (d: string) => plus(plus(maandStart(d), 32).slice(0, 8) + '01', -1)
const fmtD = (d: string, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Intl.DateTimeFormat('nl-BE', { timeZone: 'UTC', ...o }).format(new Date(d + 'T12:00:00Z'))

const PERIODES: { k: string; t: string; bereken: () => [string, string] }[] = [
  { k: 'vandaag', t: 'Vandaag', bereken: () => [vandaag(), vandaag()] },
  { k: 'gisteren', t: 'Gisteren', bereken: () => [plus(vandaag(), -1), plus(vandaag(), -1)] },
  { k: 'week', t: 'Deze week', bereken: () => [plus(vandaag(), 1 - wd(vandaag())), vandaag()] },
  { k: 'vorigeweek', t: 'Vorige week', bereken: () => { const m = plus(vandaag(), 1 - wd(vandaag()) - 7); return [m, plus(m, 6)] } },
  { k: 'maand', t: 'Deze maand', bereken: () => [maandStart(vandaag()), vandaag()] },
  { k: 'vorigemaand', t: 'Vorige maand', bereken: () => { const d = plus(maandStart(vandaag()), -1); return [maandStart(d), maandEind(d)] } },
  { k: '30', t: 'Laatste 30 dagen', bereken: () => [plus(vandaag(), -29), vandaag()] },
  { k: 'jaar', t: 'Dit jaar', bereken: () => [vandaag().slice(0, 4) + '-01-01', vandaag()] },
]

function Delta({ nu, vorig, omgekeerd = false }: { nu: number; vorig: number | undefined; omgekeerd?: boolean }) {
  if (vorig === undefined) return null
  if (vorig === 0) return nu > 0 ? <span className="text-xs font-semibold text-emerald-700">nieuw</span> : <span className="text-xs text-ink/40">–</span>
  const p = Math.round(((nu - vorig) / vorig) * 100)
  const goed = omgekeerd ? p <= 0 : p >= 0
  return <span className={`text-xs font-semibold ${p === 0 ? 'text-ink/50' : goed ? 'text-emerald-700' : 'text-red-700'}`}>{p > 0 ? '▲' : p < 0 ? '▼' : '='} {Math.abs(p)}%</span>
}

function Tegel({ titel, waarde, sub, delta }: { titel: string; waarde: string; sub?: string; delta?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{titel}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl">{waarde}</p>
      <div className="mt-0.5 flex items-center gap-2 text-xs text-ink/50">{delta}{sub && <span>{sub}</span>}</div>
    </div>
  )
}

export default function Rapportage() {
  const [periode, setPeriode] = useState('maand')
  const [van, setVan] = useState(() => maandStart(vandaag()))
  const [tot, setTot] = useState(vandaag())
  const [vergelijk, setVergelijk] = useState<'vorige' | 'vorigjaar' | 'geen'>('vorige')
  const [r, setR] = useState<Rapport | null>(null)
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState('')
  const [productOp, setProductOp] = useState<'omzet' | 'aantal'>('omzet')
  const [alleProducten, setAlleProducten] = useState(false)

  useEffect(() => {
    setLaden(true); setFout('')
    vraag<Rapport>(`/api/admin/rapportage?van=${van}&tot=${tot}&vergelijk=${vergelijk}`).then(setR).catch(e => setFout(e.message)).finally(() => setLaden(false))
  }, [van, tot, vergelijk])

  const v = r?.vorigKpi ?? undefined
  const vergelijkTekst = r?.vergelijkVan ? `${fmtD(r.vergelijkVan)} – ${fmtD(r.vergelijkTot!, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''
  const punten = useMemo(() => (r?.reeks || []).map(p => {
    const label = r!.granulariteit === 'uur' ? `${p.sleutel}u` : r!.granulariteit === 'maand' ? fmtD(p.sleutel + '-15', { month: 'short' }) : fmtD(p.sleutel)
    const tooltipLabel = r!.granulariteit === 'uur' ? `${p.sleutel}u – ${Number(p.sleutel) + 1}u` : r!.granulariteit === 'week' ? `Week van ${fmtD(p.sleutel)}` : r!.granulariteit === 'maand' ? fmtD(p.sleutel + '-15', { month: 'long', year: 'numeric' }) : fmtD(p.sleutel, { weekday: 'long', day: 'numeric', month: 'long' })
    return { label, tooltipLabel, waarde: p.omzetCent, vorig: p.vorigOmzetCent }
  }), [r])
  const producten = (r?.producten || []).slice().sort((a, b) => productOp === 'omzet' ? b.omzetCent - a.omzetCent : b.aantal - a.aantal)

  return (
    <div className="pb-10">
      <PaginaKop titel="Rapportage" sub="Enkel bestellingen via de website en app. Verkoop aan de toog zonder online bestelling zit hier niet in.">
        <a className="btn-ghost" href={`/api/admin/rapportage?van=${van}&tot=${tot}&formaat=csv`}>⬇ Export voor boekhouder (CSV)</a>
      </PaginaKop>

      {/* Filters: één rij */}
      <div className="card mb-5 flex flex-wrap items-center gap-2 p-3">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {PERIODES.map(p => (
            <button key={p.k} onClick={() => { const [a, b] = p.bereken(); setPeriode(p.k); setVan(a); setTot(b) }} className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${periode === p.k ? 'bg-ink text-white' : 'hover:bg-sand'}`}>{p.t}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <input type="date" className="input w-auto py-1.5" value={van} max={tot} onChange={e => { setPeriode('eigen'); setVan(e.target.value) }} aria-label="Van" />
          <span>–</span>
          <input type="date" className="input w-auto py-1.5" value={tot} min={van} onChange={e => { setPeriode('eigen'); setTot(e.target.value) }} aria-label="Tot" />
        </div>
        <select className="input ml-auto w-auto py-1.5 text-sm" value={vergelijk} onChange={e => setVergelijk(e.target.value as typeof vergelijk)} aria-label="Vergelijken met">
          <option value="vorige">Vergelijk met vorige periode</option>
          <option value="vorigjaar">Vergelijk met vorig jaar</option>
          <option value="geen">Niet vergelijken</option>
        </select>
      </div>

      {fout && <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{fout}</p>}
      {!r ? <p className="text-ink/50">Laden…</p> : (
        <div className={`space-y-5 transition-opacity ${laden ? 'opacity-50' : ''}`}>
          {vergelijkTekst && <p className="text-sm text-ink/60">{fmtD(r.van)} – {fmtD(r.tot, { day: 'numeric', month: 'short', year: 'numeric' })}, vergeleken met {vergelijkTekst}</p>}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tegel titel="Omzet" waarde={euro(r.kpi.omzetCent)} sub={`${euro(r.kpi.omzetExclCent)} excl. btw`} delta={<Delta nu={r.kpi.omzetCent} vorig={v?.omzetCent} />} />
            <Tegel titel="Bestellingen" waarde={String(r.kpi.bestellingen)} delta={<Delta nu={r.kpi.bestellingen} vorig={v?.bestellingen} />} />
            <Tegel titel="Gem. bestelwaarde" waarde={euro(r.kpi.gemiddeldCent)} delta={<Delta nu={r.kpi.gemiddeldCent} vorig={v?.gemiddeldCent} />} />
            <Tegel titel="Verkochte stuks" waarde={String(r.kpi.stuks)} delta={<Delta nu={r.kpi.stuks} vorig={v?.stuks} />} />
            <Tegel titel="Klanten" waarde={String(r.kpi.klanten)} sub={`${r.kpi.nieuweKlanten} nieuw`} delta={<Delta nu={r.kpi.klanten} vorig={v?.klanten} />} />
            <Tegel titel="Terugkerende klanten" waarde={`${r.kpi.terugkerendPct}%`} sub={v ? `was ${v.terugkerendPct}%` : undefined} />
            <Tegel titel="Online betaald" waarde={`${r.kpi.onlinePct}%`} sub={v ? `was ${v.onlinePct}%` : undefined} />
            <Tegel titel="No-shows / annulaties" waarde={`${r.kpi.noShows} / ${r.kpi.annulaties}`} delta={<Delta nu={r.kpi.noShows + r.kpi.annulaties} vorig={v ? v.noShows + v.annulaties : undefined} omgekeerd />} />
          </div>

          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Omzet {r.granulariteit === 'uur' ? 'per uur' : r.granulariteit === 'dag' ? 'per dag' : r.granulariteit === 'week' ? 'per week' : 'per maand'}</h2>
            <Lijngrafiek punten={punten} formaat={c => euro(c).replace(',00', '')} legende={{ huidig: 'Deze periode', vorig: vergelijk === 'vorigjaar' ? 'Vorig jaar' : 'Vorige periode' }} />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">Best verkocht</h2>
                <div className="flex rounded-md bg-sand p-0.5 text-xs font-semibold">
                  {(['omzet', 'aantal'] as const).map(k => <button key={k} onClick={() => setProductOp(k)} className={`rounded px-2.5 py-1 ${productOp === k ? 'bg-white shadow' : ''}`}>{k === 'omzet' ? 'Omzet' : 'Aantal'}</button>)}
                </div>
              </div>
              {producten.length ? (
                <>
                  <Staven rijen={producten.slice(0, alleProducten ? 100 : 10).map(p => ({ naam: p.naam, sub: p.categorie, waarde: productOp === 'omzet' ? p.omzetCent : p.aantal, vorig: v ? (productOp === 'omzet' ? p.vorigOmzetCent : p.vorigAantal) : undefined }))} formaat={x => productOp === 'omzet' ? euro(x) : `${x}×`} />
                  {producten.length > 10 && <button className="mt-3 text-sm underline" onClick={() => setAlleProducten(x => !x)}>{alleProducten ? 'Toon top 10' : `Toon alle ${producten.length}`}</button>}
                </>
              ) : <p className="py-8 text-center text-sm text-ink/50">Nog geen verkopen in deze periode.</p>}
            </section>

            <section className="card p-5">
              <h2 className="mb-4 font-display text-lg font-bold">Omzet per categorie</h2>
              {r.categorieen.some(c => c.omzetCent > 0)
                ? <Staven rijen={r.categorieen.filter(c => c.omzetCent > 0 || c.vorigOmzetCent > 0).map(c => ({ naam: c.naam, sub: `${c.aantal} st.`, waarde: c.omzetCent, vorig: v ? c.vorigOmzetCent : undefined }))} formaat={euro} />
                : <p className="py-8 text-center text-sm text-ink/50">Nog geen verkopen in deze periode.</p>}
            </section>
          </div>

          <section className="card p-5">
            <h2 className="font-display text-lg font-bold">Drukte per afhaalmoment</h2>
            <p className="mb-3 text-sm text-ink/60">Aantal bestellingen per weekdag en uur — handig om je personeel te plannen.</p>
            <Heatmap data={r.heatmap} />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-4 font-display text-lg font-bold">Populairste aanpassingen</h2>
              {r.aanpassingen.length ? <Staven rijen={r.aanpassingen.map(a => ({ naam: a.naam, waarde: a.aantal }))} formaat={x => `${x}×`} /> : <p className="py-6 text-center text-sm text-ink/50">Nog geen aanpassingen.</p>}
            </section>
            <section className="card p-5">
              <h2 className="mb-4 font-display text-lg font-bold">Gekozen opties</h2>
              {r.opties.length ? <Staven rijen={r.opties.map(a => ({ naam: a.naam, waarde: a.aantal }))} formaat={x => `${x}×`} /> : <p className="py-6 text-center text-sm text-ink/50">Nog geen opties gekozen.</p>}
            </section>
          </div>

          <section className="card overflow-x-auto p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Alle producten</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-ink/50"><tr><th className="py-2">Product</th><th>Categorie</th><th className="text-right">Aantal</th><th className="text-right">Omzet</th><th className="text-right">Aandeel</th>{v && <th className="text-right">Vs. vorige</th>}</tr></thead>
              <tbody className="divide-y divide-ink/5">
                {r.producten.map(p => (
                  <tr key={p.naam}><td className="py-2 font-medium">{p.naam}</td><td className="text-ink/60">{p.categorie}</td><td className="text-right tabular-nums">{p.aantal}</td><td className="text-right tabular-nums">{euro(p.omzetCent)}</td><td className="text-right tabular-nums text-ink/60">{r.kpi.omzetCent ? Math.round((p.omzetCent / r.kpi.omzetCent) * 1000) / 10 : 0}%</td>{v && <td className="text-right"><Delta nu={p.omzetCent} vorig={p.vorigOmzetCent} /></td>}</tr>
                ))}
                {!r.producten.length && <tr><td colSpan={6} className="py-6 text-center text-ink/50">Geen verkopen in deze periode.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  )
}
