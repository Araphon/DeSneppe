'use client'
import { useEffect } from 'react'

// Overgangsfase: klikken op bestel-links (/bestellen, /afrekenen) openen de doorstuur-URL in een nieuw tabblad.
// Niet in de De Sneppe-app (html[data-app]).
export default function DoorstuurLinks({ url }: { url: string | null }) {
  useEffect(() => {
    if (!url || document.documentElement.dataset.app === '1') return
    const klik = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a')
      if (!a || e.defaultPrevented || e.button !== 0) return
      const pad = new URL(a.href, location.href)
      if (pad.origin !== location.origin || !/^\/(bestellen|afrekenen)(\/|$)/.test(pad.pathname)) return
      e.preventDefault()
      e.stopPropagation()
      window.open(url, '_blank', 'noopener')
    }
    document.addEventListener('click', klik, true)
    return () => document.removeEventListener('click', klik, true)
  }, [url])
  return null
}
