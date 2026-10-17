'use client'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import type { MenuProduct } from '@/lib/catalogus'
import { euro, euroDelta } from '@/lib/geld'
import { berekenAllergenen } from '@/lib/allergenen'
import { Labels } from './ProductTegel'
import type { MandAanpassing, MandKeuze } from './winkelmand'

export default function ProductModal({ p, onSluit, onToevoegen }: {
  p: MenuProduct
  onSluit: () => void
  onToevoegen: (r: { aantal: number; eenheidCent: number; keuzes: MandKeuze[]; aanpassingen: MandAanpassing[] }) => void
}) {
  const [gekozen, setGekozen] = useState<Record<string, string>>(() =>
    Object.fromEntries(p.opties.map(o => [o.id, (o.keuzes.find(k => k.standaard) || (o.verplicht ? o.keuzes[0] : undefined))?.id || ''])))
  const [aanp, setAanp] = useState<Set<string>>(new Set())
  const [aantal, setAantal] = useState(1)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onSluit()
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = '' }
  }, [onSluit])

  const keuzes: MandKeuze[] = p.opties.flatMap(o => {
    const k = o.keuzes.find(k => k.id === gekozen[o.id])
    return k ? [{ optieId: o.id, keuzeId: k.id, optie: o.naam, keuze: k.naam, prijsCent: k.prijsCent }] : []
  })
  const aanpassingen: MandAanpassing[] = p.aanpassingen.filter(a => aanp.has(a.id)).map(a => ({ id: a.id, naam: a.naam, prijsCent: a.prijsCent }))
  const eenheidCent = Math.max(0, p.prijsCent + keuzes.reduce((s, k) => s + k.prijsCent, 0) + aanpassingen.reduce((s, a) => s + a.prijsCent, 0))
  const allergenen = useMemo(() => berekenAllergenen(p, gekozen), [p, gekozen])
  const ontbreekt = p.opties.filter(o => o.verplicht && !gekozen[o.id])
  const max = p.maxPerBestelling || 99

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onSluit} role="dialog" aria-modal="true" aria-label={p.naam}>
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="overflow-y-auto">
          <div className="relative aspect-[16/10] bg-sand">
            {p.afbeelding && <Image src={p.afbeelding} alt={p.naam} fill sizes="512px" className="object-cover" />}
            <button onClick={onSluit} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow" aria-label="Sluiten">✕</button>
          </div>
          <div className="p-5">
            <h2 className="font-display text-2xl font-bold">{p.naam}<Labels labels={p.labels} size={22} /></h2>
            {p.omschrijving && <p className="mt-1 text-ink/70">{p.omschrijving}</p>}
            <p className="mt-2 text-lg font-semibold text-brand-dark">{euro(p.prijsCent)}</p>
            {p.leeftijdsgrens && <p className="mt-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white">🔞 Geen verkoop van alcohol onder de {p.leeftijdsgrens} jaar</p>}
            {p.beschikbaarBadge && <p className="mt-2 rounded-lg bg-sand px-3 py-2 text-sm">🕒 Af te halen: {p.beschikbaarBadge.replace(/^Enkel /, 'enkel ')}</p>}

            {p.opties.map(o => (
              <fieldset key={o.id} className="mt-6">
                <legend className="mb-2 flex w-full items-center justify-between font-semibold">
                  {o.naam}
                  {o.verplicht && <span className={`rounded-full px-2 py-0.5 text-xs ${gekozen[o.id] ? 'bg-sand text-ink/60' : 'bg-brand-light text-brand-dark'}`}>Verplicht</span>}
                </legend>
                <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
                  {o.keuzes.map(k => (
                    <label key={k.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-cream">
                      <input type="radio" name={o.id} checked={gekozen[o.id] === k.id} onChange={() => setGekozen(g => ({ ...g, [o.id]: k.id }))} className="h-5 w-5 accent-brand" />
                      <span className="flex-1">{k.naam}</span>
                      {k.prijsCent !== 0 && <span className="text-sm text-ink/60">{euroDelta(k.prijsCent)}</span>}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            {p.aanpassingenActief && p.aanpassingen.length > 0 && (
              <fieldset className="mt-6">
                <legend className="mb-2 font-semibold">{p.aanpassingenTitel}</legend>
                <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
                  {p.aanpassingen.map(a => (
                    <label key={a.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-cream">
                      <input type="checkbox" checked={aanp.has(a.id)} onChange={e => setAanp(s => { const n = new Set(s); if (e.target.checked) n.add(a.id); else n.delete(a.id); return n })} className="h-5 w-5 rounded accent-brand" />
                      <span className="flex-1">{a.naam}</span>
                      {a.prijsCent !== 0 && <span className="text-sm text-ink/60">{euroDelta(a.prijsCent)}</span>}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {allergenen.ingevuld && (allergenen.bevat.length > 0 || allergenen.sporen.length > 0 || allergenen.opmerking) && (
              <div className="mt-6 space-y-1.5 rounded-lg bg-mustard/15 p-3 text-sm">
                <p className="font-semibold">Allergenen</p>
                {allergenen.bevat.length > 0 && <p><span className="text-ink/60">Bevat: </span>{allergenen.bevat.map(a => <span key={a.id} className="mr-1.5 inline-flex items-center gap-1 rounded bg-white px-1.5 py-0.5 font-medium">{a.icoon} {a.naam}</span>)}</p>}
                {allergenen.sporen.length > 0 && <p><span className="text-ink/60">Kan sporen bevatten van: </span>{allergenen.sporen.map(a => `${a.icoon || ''} ${a.naam}`.trim()).join(', ')}</p>}
                {allergenen.opmerking && <p className="text-ink/70">{allergenen.opmerking}</p>}
              </div>
            )}
            {allergenen.ingevuld && !allergenen.bevat.length && !allergenen.sporen.length && !allergenen.opmerking && <p className="mt-6 text-sm text-ink/60">✓ Bevat volgens onze gegevens geen van de 14 wettelijke allergenen</p>}
            {p.loyaltyPunten > 0 && <p className="mt-4 text-sm text-emerald-700">⭐ Je spaart {p.loyaltyPunten} punten met dit product</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-ink/10 p-4">
          <div className="flex items-center rounded-full border border-ink/15">
            <button className="h-11 w-11 text-xl" onClick={() => setAantal(a => Math.max(1, a - 1))} aria-label="Minder">−</button>
            <span className="w-6 text-center font-semibold" aria-live="polite">{aantal}</span>
            <button className="h-11 w-11 text-xl" onClick={() => setAantal(a => Math.min(max, a + 1))} aria-label="Meer">+</button>
          </div>
          <button
            className="btn-brand flex-1 py-3"
            disabled={ontbreekt.length > 0}
            onClick={() => onToevoegen({ aantal, eenheidCent, keuzes, aanpassingen })}
          >
            {ontbreekt.length ? `Kies: ${ontbreekt[0].naam}` : `Toevoegen · ${euro(eenheidCent * aantal)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
