'use client'
import { useEffect, useState } from 'react'
import { euro, euroDelta } from '@/lib/geld'
import { vraag } from './fetcher'
import { betaalInApp, isNative } from './app/native'

type Regel = { id: string; productNaam: string; aantal: number; totaalCent: number; keuzes: { optie: string; keuze: string; prijsCent: number }[]; aanpassingen: { naam: string; prijsCent: number }[] }
export type BestellingData = { id: string; nummer: number; slotMinuten?: number; status: string; afhaalTijd: string; totaalCent: number; opmerking: string | null; puntenVerdiend: number; regels: Regel[]; aangemaaktOp: string; betaalwijze: string; betaalStatus: string; transactiekostCent: number; kostLabel: string | null }

const STAPPEN = [
  { s: 'ONTVANGEN', t: 'Ontvangen' },
  { s: 'BEZIG', t: 'Bezig' },
  { s: 'KLAAR', t: 'Klaar' },
]

export function fmtDag(iso: string) {
  return new Intl.DateTimeFormat('nl-BE', { timeZone: 'Europe/Brussels', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso))
}
export function fmtSlot(iso: string, min = 15) {
  return `${fmtTijd(iso)} – ${fmtTijd(new Date(new Date(iso).getTime() + min * 60000).toISOString())}`
}
export function fmtTijd(iso: string) {
  return new Intl.DateTimeFormat('nl-BE', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function RegelLijst({ regels }: { regels: Regel[] }) {
  return (
    <ul className="divide-y divide-ink/10">
      {regels.map(r => (
        <li key={r.id} className="flex justify-between gap-4 py-2.5">
          <div>
            <p className="font-medium">{r.aantal}× {r.productNaam}</p>
            {r.keuzes.map((k, i) => <p key={i} className="text-sm text-ink/60">{k.keuze} {k.prijsCent ? euroDelta(k.prijsCent) : ''}</p>)}
            {r.aanpassingen.map((a, i) => <p key={i} className="text-sm text-ink/60">• {a.naam} {a.prijsCent ? euroDelta(a.prijsCent) : ''}</p>)}
          </div>
          <p className="font-medium">{euro(r.totaalCent)}</p>
        </li>
      ))}
    </ul>
  )
}

export default function BestelStatus({ id, nieuw }: { id: string; nieuw: boolean }) {
  const [b, setB] = useState<BestellingData | null>(null)
  const [fout, setFout] = useState('')
  useEffect(() => {
    let stop = false
    const laad = () => vraag<BestellingData>(`/api/bestellingen/${id}`).then(d => !stop && setB(d)).catch(e => setFout(e.message))
    laad()
    const t = setInterval(laad, 15000)
    return () => { stop = true; clearInterval(t) }
  }, [id])

  // Terug van de betaalpagina: sneller opvolgen tot de betaling bevestigd is
  useEffect(() => {
    if (b?.betaalStatus !== 'OPEN') return
    const t = setInterval(() => vraag<BestellingData>(`/api/bestellingen/${id}`).then(setB).catch(() => {}), 3000)
    return () => clearInterval(t)
  }, [b?.betaalStatus, id])

  const [betaalFout, setBetaalFout] = useState('')
  const [betaalBezig, setBetaalBezig] = useState(false)
  async function opnieuwBetalen() {
    setBetaalFout(''); setBetaalBezig(true)
    try {
      const r = await vraag<{ betaalUrl?: string; betaald?: boolean }>(`/api/bestellingen/${id}/betalen`, 'POST')
      if (r.betaalUrl && isNative()) { await betaalInApp(id, r.betaalUrl); setBetaalBezig(false) }
      else if (r.betaalUrl) window.location.href = r.betaalUrl
      else { setB(await vraag<BestellingData>(`/api/bestellingen/${id}`)); setBetaalBezig(false) }
    } catch (e) { setBetaalFout((e as Error).message); setBetaalBezig(false) }
  }

  if (fout) return <p className="py-20 text-center">{fout === 'Niet gevonden' ? 'Deze bestelling werd niet gevonden. Ben je aangemeld?' : fout}</p>
  if (!b) return <p className="py-20 text-center text-ink/50">Laden…</p>
  const idx = STAPPEN.findIndex(s => s.s === b.status)
  const klaar = b.status === 'KLAAR' || b.status === 'AFGEHAALD'
  const online = b.betaalwijze === 'ONLINE'
  if (online && b.betaalStatus === 'OPEN') return (
    <div className="mx-auto max-w-xl card p-8 text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-sand border-t-ink" />
      <p className="font-display text-2xl font-bold">Betaling wordt verwerkt…</p>
      <p className="mt-2 text-ink/60">Even geduld, we wachten op de bevestiging van je betaling.</p>
      <button className="mt-6 text-sm text-ink/60 underline" onClick={opnieuwBetalen} disabled={betaalBezig}>Betaalpagina niet afgerond? Opnieuw naar betalen</button>
      {betaalFout && <p className="mt-3 text-sm text-red-700">{betaalFout}</p>}
    </div>
  )
  if (online && b.betaalStatus === 'MISLUKT') return (
    <div className="mx-auto max-w-xl card p-8 text-center">
      <p className="text-4xl">💳</p>
      <p className="mt-2 font-display text-2xl font-bold">De betaling is niet gelukt</p>
      <p className="mt-2 text-ink/60">Je bestelling #{b.nummer} is daarom nog niet doorgegeven aan De Sneppe.</p>
      <button className="btn-brand mt-6 px-8 py-3" onClick={opnieuwBetalen} disabled={betaalBezig}>{betaalBezig ? 'Even geduld…' : 'Opnieuw proberen te betalen'}</button>
      {betaalFout && <p className="mt-3 text-sm text-red-700">{betaalFout}</p>}
    </div>
  )
  return (
    <div className="mx-auto max-w-xl">
      {(nieuw || (online && b.betaalStatus === 'BETAALD' && typeof window !== 'undefined' && window.location.search.includes('betaling=1'))) && <div className="mb-6 rounded-2xl bg-emerald-50 p-5 text-emerald-900"><p className="font-display text-2xl font-bold">Bedankt! 🎉</p><p>Je bestelling is goed ontvangen. Je krijgt ook een bevestiging per e-mail.</p></div>}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ink/60">Bestelling</p>
            <p className="font-display text-4xl font-bold">#{b.nummer}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink/60">Afhalen</p>
            <p className="font-semibold capitalize">{fmtDag(b.afhaalTijd)}</p>
            <p className="font-display text-2xl font-bold text-brand-dark">{fmtSlot(b.afhaalTijd, b.slotMinuten)}</p>
          </div>
        </div>
        {b.status === 'GEANNULEERD'
          ? <p className="mt-6 rounded-xl bg-red-50 p-4 font-semibold text-red-700">Deze bestelling werd geannuleerd.</p>
          : (
            <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Status">
              {STAPPEN.map((s, i) => (
                <li key={s.s} className="text-center">
                  <div className={`h-2 rounded-full ${i <= idx || klaar ? 'bg-brand' : 'bg-sand'}`} />
                  <p className={`mt-2 text-sm ${i === idx || (klaar && i === 2) ? 'font-bold' : 'text-ink/50'}`}>{s.t}</p>
                </li>
              ))}
            </ol>
          )}
        {b.status === 'NIET_AFGEHAALD' && <p className="mt-4 rounded-xl bg-red-50 p-4 font-semibold text-red-700">Deze bestelling werd niet afgehaald.</p>}
        {klaar && <p className="mt-4 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">Je bestelling ligt klaar! Loop meteen door naar de kassa.</p>}
        <div className="mt-6"><RegelLijst regels={b.regels} /></div>
        {b.transactiekostCent > 0 && <div className="mt-2 flex justify-between border-t border-ink/10 pt-3 text-sm"><span>{b.kostLabel || 'Servicekost'}</span><span>{euro(b.transactiekostCent)}</span></div>}
        <div className={`flex justify-between text-lg font-bold ${b.transactiekostCent > 0 ? 'mt-1' : 'mt-2 border-t border-ink/10 pt-3'}`}><span>Totaal</span><span>{euro(b.totaalCent)}</span></div>
        <p className={`text-sm ${b.betaalStatus === 'BETAALD' ? 'font-semibold text-emerald-700' : 'text-ink/60'}`}>{b.betaalStatus === 'BETAALD' ? '✓ Online betaald' : b.betaalStatus === 'TERUGBETAALD' ? 'Terugbetaald' : 'Te betalen bij afhaling'}</p>
        {b.opmerking && <p className="mt-4 rounded-xl bg-sand p-3 text-sm"><strong>Opmerking:</strong> {b.opmerking}</p>}
        {b.puntenVerdiend > 0 && <p className="mt-4 text-sm text-emerald-700">⭐ Je spaart {b.puntenVerdiend} punten met deze bestelling (bijgeschreven zodra ze klaar is).</p>}
      </div>
    </div>
  )
}
