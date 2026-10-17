'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { vraag } from '../fetcher'
import Modal from '../Modal'
import FotoUpload from './FotoUpload'

// Kies tot `max` foto's: uit de productfoto's of een eigen upload. Waarde = komma-gescheiden paden.
export default function FotoKiezer({ waarde, max, onChange }: { waarde: string; max: number; onChange: (w: string) => void }) {
  const gekozen = waarde.split(',').map(x => x.trim()).filter(Boolean)
  const [open, setOpen] = useState(false)
  const [fotos, setFotos] = useState<{ src: string; naam: string }[]>([])
  useEffect(() => {
    if (!open || fotos.length) return
    vraag<{ afbeelding: string | null; naam: string }[]>('/api/admin/producten').then(l => {
      const gezien = new Set<string>()
      setFotos(l.filter(p => p.afbeelding && !gezien.has(p.afbeelding) && gezien.add(p.afbeelding)).map(p => ({ src: p.afbeelding!, naam: p.naam })))
    })
  }, [open, fotos.length])
  const zet = (l: string[]) => onChange(l.slice(0, max).join(','))
  const verplaats = (i: number, d: number) => { const n = [...gekozen]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; zet(n) }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {gekozen.map((src, i) => (
          <div key={src + i} className="group relative h-28 w-28 overflow-hidden rounded-lg ring-1 ring-ink/10">
            <Image src={src} alt="" fill sizes="112px" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100">
              <button type="button" onClick={() => verplaats(i, -1)} aria-label="Naar links" className="px-1">←</button>
              <button type="button" onClick={() => zet(gekozen.filter((_, j) => j !== i))} aria-label="Verwijderen" className="px-1">✕</button>
              <button type="button" onClick={() => verplaats(i, 1)} aria-label="Naar rechts" className="px-1">→</button>
            </div>
          </div>
        ))}
        {gekozen.length < max && (
          <button type="button" onClick={() => setOpen(true)} className="grid h-28 w-28 place-items-center rounded-lg border-2 border-dashed border-ink/20 text-center text-sm text-ink/50 hover:border-ink">＋<br />Foto kiezen</button>
        )}
      </div>
      <p className="mt-2 text-xs text-ink/50">{gekozen.length ? `${gekozen.length}/${max} gekozen. Beweeg over een foto om de volgorde te wijzigen of ze te verwijderen.` : `Niets gekozen: de website kiest automatisch productfoto’s. Kies er zelf ${max} voor het beste resultaat.`}</p>
      {open && (
        <Modal titel="Foto kiezen" onSluit={() => setOpen(false)} breed>
          <p className="mb-2 text-sm font-semibold">Eigen foto uploaden</p>
          <FotoUpload map="site" grootte={110} waarde={null} onChange={p => { if (p) { zet([...gekozen, p]); setOpen(false) } }} />
          <p className="mb-2 mt-6 text-sm font-semibold">Of kies een productfoto</p>
          <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
            {fotos.map(f => (
              <button key={f.src} type="button" title={f.naam} disabled={gekozen.includes(f.src)} onClick={() => { zet([...gekozen, f.src]); setOpen(false) }}
                className="relative aspect-square overflow-hidden rounded-md ring-1 ring-ink/10 hover:ring-2 hover:ring-ink disabled:opacity-30">
                <Image src={f.src} alt={f.naam} fill sizes="120px" className="object-cover" />
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
