'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Horizontale rij met pijltjes (desktop) en swipen (mobiel)
export default function Carrousel({ children, label }: { children: React.ReactNode; label: string }) {
  const rij = useRef<HTMLDivElement>(null)
  const [links, setLinks] = useState(false)
  const [rechts, setRechts] = useState(false)

  const check = useCallback(() => {
    const el = rij.current
    if (!el) return
    setLinks(el.scrollLeft > 4)
    setRechts(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    check()
    const el = rij.current
    el?.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => { el?.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [check])

  const schuif = (richting: number) => {
    const el = rij.current
    if (el) el.scrollBy({ left: richting * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  const knop = 'absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-lg bg-white text-ink shadow-lg ring-1 ring-ink/10 transition hover:bg-ink hover:text-white sm:grid'
  return (
    <div className="relative" role="region" aria-label={label}>
      {links && <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-12 bg-gradient-to-r from-cream to-transparent" />}
      {rechts && <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-12 bg-gradient-to-l from-cream to-transparent" />}
      {links && <button type="button" onClick={() => schuif(-1)} className={`${knop} -left-3`} aria-label="Vorige"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg></button>}
      {rechts && <button type="button" onClick={() => schuif(1)} className={`${knop} -right-3`} aria-label="Volgende"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg></button>}
      <div ref={rij} className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-smooth pb-2">{children}</div>
    </div>
  )
}
