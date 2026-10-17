'use client'
import Link from 'next/link'
import { euro } from '@/lib/geld'
import { useWinkelmand } from './winkelmand'

export function MandRegels({ compact = false }: { compact?: boolean }) {
  const { mand, zetAantal } = useWinkelmand()
  return (
    <ul className="divide-y divide-ink/10">
      {mand.map(r => (
        <li key={r.key} className="flex gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">{r.naam}</p>
            {r.keuzes.map(k => <p key={k.keuzeId} className="text-sm text-ink/60">{k.keuze}</p>)}
            {r.aanpassingen.map(a => <p key={a.id} className="text-sm text-ink/60">• {a.naam}</p>)}
            {!compact && (
              <div className="mt-2 inline-flex items-center rounded-full border border-ink/15 text-sm">
                <button className="h-8 w-8" onClick={() => zetAantal(r.key, r.aantal - 1)} aria-label="Minder">{r.aantal === 1 ? '🗑' : '−'}</button>
                <span className="w-5 text-center font-semibold">{r.aantal}</span>
                <button className="h-8 w-8" onClick={() => zetAantal(r.key, r.aantal + 1)} aria-label="Meer">+</button>
              </div>
            )}
          </div>
          <p className="font-semibold">{compact && `${r.aantal}× `}{euro(r.eenheidCent * r.aantal)}</p>
        </li>
      ))}
    </ul>
  )
}

export default function Mandje({ onSluit }: { onSluit?: () => void }) {
  const { mand, totaalCent, geladen } = useWinkelmand()
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink/10 p-4">
        <h2 className="font-display text-xl font-bold">Je bestelling</h2>
        {onSluit && <button onClick={onSluit} className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand" aria-label="Sluiten">✕</button>}
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        {geladen && mand.length === 0
          ? <p className="py-10 text-center text-ink/50">Je mandje is nog leeg.<br />Kies iets lekkers!</p>
          : <MandRegels />}
      </div>
      {mand.length > 0 && (
        <div className="border-t border-ink/10 p-4">
          <div className="mb-3 flex justify-between text-lg font-bold"><span>Totaal</span><span>{euro(totaalCent)}</span></div>
          <Link href="/afrekenen" className="btn-brand w-full py-3">Afrekenen</Link>
          <p className="mt-2 text-center text-xs text-ink/50">Je betaalt bij het afhalen</p>
        </div>
      )}
    </div>
  )
}
