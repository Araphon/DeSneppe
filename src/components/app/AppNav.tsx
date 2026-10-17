'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useWinkelmand } from '../winkelmand'

const I = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />,
  bestellen: <><path d="M5 8h14l-1.2 11.1a2 2 0 01-2 1.9H8.2a2 2 0 01-2-1.9z" /><path d="M9 8V6a3 3 0 016 0v2" /></>,
  bestellingen: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  punten: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
}

// Onderbalk die enkel in de app zichtbaar is (via html[data-app])
export default function AppNav() {
  const pad = usePathname()
  const [hash, setHash] = useState('')
  const { aantal } = useWinkelmand()
  useEffect(() => {
    const zet = () => setHash(location.hash.replace('#', ''))
    zet(); window.addEventListener('hashchange', zet)
    return () => window.removeEventListener('hashchange', zet)
  }, [pad])
  const items = [
    { href: '/', label: 'Home', icoon: I.home, actief: pad === '/' },
    { href: '/bestellen', label: 'Bestellen', icoon: I.bestellen, actief: pad.startsWith('/bestellen') || pad.startsWith('/afrekenen') || pad.startsWith('/menu'), badge: aantal },
    { href: '/account#bestellingen', label: 'Bestellingen', icoon: I.bestellingen, actief: pad.startsWith('/bestelling') || (pad === '/account' && (hash === '' || hash === 'bestellingen')) },
    { href: '/account#punten', label: 'Spaarkaart', icoon: I.punten, actief: pad === '/account' && hash === 'punten' },
    { href: '/account#gegevens', label: 'Account', icoon: I.account, actief: pad.startsWith('/account') && ['gegevens', 'meldingen'].includes(hash) },
  ]
  return (
    <nav className="alleen-app fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="App-menu">
      {items.map(i => (
        <Link key={i.label} href={i.href} className={`relative flex h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${i.actief ? 'text-ink' : 'text-ink/45'}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={i.actief ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{i.icoon}</svg>
          {i.label}
          {i.actief && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />}
          {!!i.badge && <span className="absolute right-[calc(50%-22px)] top-2 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-ink">{i.badge}</span>}
        </Link>
      ))}
    </nav>
  )
}
