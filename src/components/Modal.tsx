'use client'
import { useEffect } from 'react'

export default function Modal({ titel, children, onSluit, breed = false }: { titel: string; children: React.ReactNode; onSluit: () => void; breed?: boolean }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onSluit()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onSluit])
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onSluit} role="dialog" aria-modal="true" aria-label={titel}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl ${breed ? 'max-w-2xl' : 'max-w-md'}`} onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-bold">{titel}</h2>
          <button onClick={onSluit} className="-mr-2 -mt-1 grid h-9 w-9 place-items-center rounded-full hover:bg-sand" aria-label="Sluiten">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Bevestig({ titel, tekst, knop = 'Bevestigen', gevaarlijk = false, bezig = false, onJa, onNee }: {
  titel: string; tekst: React.ReactNode; knop?: string; gevaarlijk?: boolean; bezig?: boolean; onJa: () => void; onNee: () => void
}) {
  return (
    <Modal titel={titel} onSluit={onNee}>
      <div className="text-ink/75">{tekst}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onNee}>Annuleren</button>
        <button className={gevaarlijk ? 'btn bg-red-600 text-white hover:bg-red-700' : 'btn-brand'} disabled={bezig} onClick={onJa}>{bezig ? 'Even geduld…' : knop}</button>
      </div>
    </Modal>
  )
}
