'use client'
import { useEffect, useState } from 'react'

export function Switch({ aan, onChange, label, disabled }: { aan: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={aan} aria-label={label} disabled={disabled} onClick={() => onChange(!aan)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${aan ? 'bg-emerald-500' : 'bg-ink/20'}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${aan ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export function Kaart({ titel, uitleg, toggle, children, actie }: { titel: string; uitleg?: string; toggle?: { aan: boolean; onChange: (v: boolean) => void; label: string }; children?: React.ReactNode; actie?: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold">{titel}</h2>
          {uitleg && <p className="text-sm text-ink/60">{uitleg}</p>}
        </div>
        {actie}
        {toggle && (
          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
            <span className="hidden sm:inline">{toggle.label}</span>
            <Switch aan={toggle.aan} onChange={toggle.onChange} label={toggle.label} />
          </label>
        )}
      </div>
      {children && (!toggle || toggle.aan) && <div className="mt-4">{children}</div>}
    </section>
  )
}

// Bedrag in euro (met komma), waarde in centen
export function CentInput({ cent, onChange, className = '', toelatenNegatief = true, placeholder = '0,00' }: { cent: number; onChange: (c: number) => void; className?: string; toelatenNegatief?: boolean; placeholder?: string }) {
  const [tekst, setTekst] = useState(cent ? (cent / 100).toFixed(2).replace('.', ',') : '')
  useEffect(() => {
    const huidige = Math.round(Number(tekst.replace(',', '.') || 0) * 100)
    if (huidige !== cent) setTekst(cent ? (cent / 100).toFixed(2).replace('.', ',') : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cent])
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">€</span>
      <input className="input pl-7 text-right" inputMode="decimal" value={tekst} placeholder={placeholder}
        onChange={e => {
          const t = e.target.value.replace(/[^\d,.-]/g, '')
          setTekst(t)
          const n = Number(t.replace(',', '.'))
          if (Number.isFinite(n)) onChange(Math.round((toelatenNegatief ? n : Math.abs(n)) * 100))
        }} />
    </div>
  )
}

export function Melding({ m }: { m: { ok: boolean; t: string } | null }) {
  if (!m) return null
  return <div className={`fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-xl ${m.ok ? 'bg-ink' : 'bg-red-600'}`} role="status">{m.ok ? '✓ ' : ''}{m.t}</div>
}

export function useMelding() {
  const [m, setM] = useState<{ ok: boolean; t: string } | null>(null)
  useEffect(() => { if (!m) return; const t = setTimeout(() => setM(null), 2800); return () => clearTimeout(t) }, [m])
  return { m, ok: (t: string) => setM({ ok: true, t }), fout: (t: string) => setM({ ok: false, t }) }
}

export function PaginaKop({ titel, sub, children }: { titel: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h-display text-3xl">{titel}</h1>
        {sub && <p className="text-ink/60">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
