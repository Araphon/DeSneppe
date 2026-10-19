'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isNative } from './app/native'
import { useWinkelmand } from './winkelmand'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/over-ons', label: 'Over ons' },
  { href: '/contact', label: 'Contact' },
]

export default function Header({ status, open }: { status: string; open: boolean }) {
  const pad = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const { aantal } = useWinkelmand()
  // In de app is het logo een snelkoppeling naar de bestelkant (de website-homepagina bestaat er niet)
  const [thuis, setThuis] = useState('/')
  useEffect(() => { if (isNative()) setThuis('/bestellen') }, [])
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="container-x flex h-16 items-center gap-4">
        <Link href={thuis} className="flex items-center gap-3" aria-label="De Sneppe – home">
          <Image src="/logo-wit.png" alt="De Sneppe" width={52} height={52} priority className="h-11 w-auto" />
          <span className="hidden flex-col leading-tight sm:flex [html[data-app]_&]:flex">
            <span className="font-display text-lg font-bold tracking-wide">DE SNEPPE</span>
            <span className={`text-xs ${open ? 'text-emerald-300' : 'text-white/60'}`}>● {status}</span>
          </span>
        </Link>
        <nav className="niet-app ml-auto hidden items-center gap-1 md:flex" aria-label="Hoofdmenu">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={`rounded-full px-4 py-2 text-sm font-medium transition hover:bg-white/10 ${pad === n.href ? 'bg-white/10' : ''}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="niet-app ml-auto flex items-center gap-2 md:ml-2">
          <Link href="/account" className="rounded-full p-2 hover:bg-white/10" aria-label="Mijn account">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>
          </Link>
          <Link href="/bestellen" className="btn-brand btn-sm relative">
            Bestellen
            {aantal > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-xs font-bold text-ink">{aantal}</span>}
          </Link>
          <button className="rounded-full p-2 hover:bg-white/10 md:hidden" onClick={() => setMenuOpen(v => !v)} aria-label="Menu" aria-expanded={menuOpen}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{menuOpen ? <path d="M6 6l12 12M18 6L6 18"/> : <path d="M4 7h16M4 12h16M4 17h16"/>}</svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="border-t border-white/10 md:hidden" aria-label="Mobiel menu">
          <div className="container-x flex flex-col py-2">
            {NAV.map(n => <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 font-medium hover:bg-white/10">{n.label}</Link>)}
            <p className={`px-3 py-2 text-sm ${open ? 'text-emerald-300' : 'text-white/60'}`}>● {status}</p>
          </div>
        </nav>
      )}
    </header>
  )
}
