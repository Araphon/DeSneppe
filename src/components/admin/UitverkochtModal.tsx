'use client'
import { useState } from 'react'
import Modal from '../Modal'

export type UitverkochtModus = 'vandaag' | 'week' | 'periode' | 'manueel'

export default function UitverkochtModal({ naam, onKies, onSluit }: { naam: string; onKies: (modus: UitverkochtModus, tot?: string) => Promise<void> | void; onSluit: () => void }) {
  const vandaag = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())
  const [modus, setModus] = useState<UitverkochtModus>('vandaag')
  const [tot, setTot] = useState(vandaag)
  const [bezig, setBezig] = useState(false)
  const opties: { k: UitverkochtModus; t: string; s: string }[] = [
    { k: 'vandaag', t: 'Vandaag', s: 'Morgen automatisch terug beschikbaar' },
    { k: 'week', t: 'Deze week', s: 'Maandag automatisch terug beschikbaar' },
    { k: 'periode', t: 'Aangepaste periode', s: 'Tot en met een gekozen datum' },
    { k: 'manueel', t: 'Tot ik het terug aanzet', s: 'Blijft uitverkocht tot je het manueel terug activeert' },
  ]
  return (
    <Modal titel={`“${naam}” inactief zetten`} onSluit={onSluit}>
      <p className="mb-4 text-sm text-ink/60">Het product blijft zichtbaar in de shop, maar grijs met “Tijdelijk uitverkocht”.</p>
      <div className="space-y-2">
        {opties.map(o => (
          <label key={o.k} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${modus === o.k ? 'border-brand bg-brand-light/40' : 'border-ink/10'}`}>
            <input type="radio" className="mt-1 h-4 w-4 accent-brand" checked={modus === o.k} onChange={() => setModus(o.k)} />
            <span className="flex-1"><span className="block font-semibold">{o.t}</span><span className="text-sm text-ink/60">{o.s}</span>
              {o.k === 'periode' && modus === 'periode' && <input type="date" className="input mt-2" min={vandaag} value={tot} onChange={e => setTot(e.target.value)} />}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onSluit}>Annuleren</button>
        <button className="btn-ink" disabled={bezig} onClick={async () => { setBezig(true); await onKies(modus, tot); setBezig(false) }}>Uitverkocht zetten</button>
      </div>
    </Modal>
  )
}
