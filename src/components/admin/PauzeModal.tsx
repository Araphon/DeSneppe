'use client'
import { useEffect, useState } from 'react'
import Modal from '../Modal'
import { vraag } from '../fetcher'
import { Switch } from './ui'
import { euro } from '@/lib/geld'

type Slot = { tijd: string; voorbij: boolean; geblokkeerd: boolean; aantal: number; omzetCent: number }
type Data = { datum: string; slotMinuten: number; bestellenActief: boolean; slots: Slot[]; nu: string }

export default function PauzeModal({ onSluit, onGewijzigd }: { onSluit: () => void; onGewijzigd: () => void }) {
  const [d, setD] = useState<Data | null>(null)
  const [keuze, setKeuze] = useState<Set<string>>(new Set())
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  useEffect(() => { vraag<Data>('/api/admin/pauze').then(x => { setD(x); setKeuze(new Set(x.slots.filter(s => s.geblokkeerd).map(s => s.tijd))) }) }, [])

  if (!d) return <Modal titel="Afhaalmomenten blokkeren" onSluit={onSluit}><p className="text-ink/50">Laden…</p></Modal>
  const komend = d.slots.filter(s => !s.voorbij)
  const zet = (tijden: string[], aan: boolean) => setKeuze(k => { const n = new Set(k); tijden.forEach(t => aan ? n.add(t) : n.delete(t)); return n })
  const volgende = (min: number) => komend.slice(0, Math.max(1, Math.ceil(min / d.slotMinuten))).map(s => s.tijd)

  async function opslaan(extra: { bestellenActief?: boolean } = {}) {
    setBezig(true); setFout('')
    try { await vraag('/api/admin/pauze', 'PUT', { datum: d!.datum, geblokkeerd: Array.from(keuze), ...extra }); onGewijzigd(); onSluit() }
    catch (e) { setFout((e as Error).message); setBezig(false) }
  }

  return (
    <Modal titel="Afhaalmomenten blokkeren" onSluit={onSluit} breed>
      <div className="mb-5 flex items-center justify-between gap-4 rounded-lg bg-sand p-4">
        <span><span className="block font-semibold">Online bestellen</span><span className="text-sm text-ink/60">{d.bestellenActief ? 'Klanten kunnen bestellen' : 'Volledig gepauzeerd — niemand kan online bestellen'}</span></span>
        <Switch aan={d.bestellenActief} label="Online bestellen" onChange={async v => { await vraag('/api/admin/pauze', 'PUT', { bestellenActief: v }); setD({ ...d, bestellenActief: v }); onGewijzigd() }} />
      </div>

      <p className="mb-2 font-semibold">Welke afhaalmomenten van vandaag wil je dichtzetten?</p>
      {!komend.length ? <p className="text-ink/50">Er zijn vandaag geen afhaalmomenten meer.</p> : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <button className="btn-ghost btn-sm" onClick={() => zet(volgende(30), true)}>Volgende 30 min</button>
            <button className="btn-ghost btn-sm" onClick={() => zet(volgende(60), true)}>Volgende uur</button>
            <button className="btn-ghost btn-sm" onClick={() => zet(komend.map(s => s.tijd), true)}>Rest van vandaag</button>
            <button className="btn-ghost btn-sm" onClick={() => zet(komend.map(s => s.tijd), false)}>Alles terug open</button>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {komend.map(s => {
              const dicht = keuze.has(s.tijd)
              return (
                <button key={s.tijd} onClick={() => zet([s.tijd], !dicht)} className={`rounded-lg border p-2 text-left transition ${dicht ? 'border-red-500 bg-red-50' : 'border-ink/15 bg-white hover:border-ink'}`}>
                  <span className="flex items-center justify-between font-display text-lg font-bold">{s.tijd}<span className="text-sm">{dicht ? '⛔' : ''}</span></span>
                  <span className="block text-xs text-ink/60">{s.aantal ? `${s.aantal} best. · ${euro(s.omzetCent)}` : 'leeg'}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-ink/50">Tik op een kwartier om het dicht of open te zetten. Bestellingen die al geplaatst zijn, blijven gewoon staan — er komen enkel geen nieuwe bij.</p>
        </>
      )}
      {fout && <p className="mt-3 text-sm text-red-700">{fout}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onSluit}>Annuleren</button>
        <button className="btn-ink" disabled={bezig} onClick={() => opslaan()}>{bezig ? 'Opslaan…' : `Opslaan (${keuze.size} dicht)`}</button>
      </div>
    </Modal>
  )
}
