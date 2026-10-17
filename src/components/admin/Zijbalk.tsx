'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { vraag } from '../fetcher'

const NAV = [
  { href: '/admin', label: 'Bestellingen', icoon: '🧾' },
  { href: '/admin/rapportage', label: 'Rapportage', icoon: '📊' },
  { href: '/admin/producten', label: 'Producten', icoon: '🥪' },
  { href: '/admin/categorieen', label: 'Categorieën', icoon: '🗂️' },
  { href: '/admin/labels', label: 'Labels', icoon: '🏷️' },
  { href: '/admin/allergenen', label: 'Allergenen', icoon: '⚠️' },
  { href: '/admin/openingsuren', label: 'Openingsuren', icoon: '🕒' },
  { href: '/admin/loyalty', label: 'Loyalty', icoon: '⭐' },
  { href: '/admin/klanten', label: 'Klanten', icoon: '👥' },
  { href: '/admin/marketing', label: 'Marketing', icoon: '📣' },
  { href: '/admin/website', label: 'Website-teksten & foto’s', icoon: '✏️' },
  { href: '/admin/printontwerp', label: 'Ticket & sticker', icoon: '🖨️' },
  { href: '/admin/beheerders', label: 'Beheerders', icoon: '🔑' },
  { href: '/admin/instellingen', label: 'Instellingen', icoon: '⚙️' },
]

export default function Zijbalk({ naam }: { naam: string }) {
  const pad = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const actief = (h: string) => h === '/admin' ? pad === '/admin' : pad.startsWith(h)
  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map(n => (
        <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${actief(n.href) ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10'}`}>
          <span className="w-5 text-center">{n.icoon}</span>{n.label}
        </Link>
      ))}
      <div className="my-3 border-t border-white/10" />
      <Link href="/kassa" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10"><span className="w-5 text-center">📟</span>Kassa (iPad)</Link>
      <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10"><span className="w-5 text-center">🌐</span>Website bekijken</Link>
    </nav>
  )
  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-ink px-4 text-white lg:hidden">
        <button onClick={() => setOpen(v => !v)} aria-label="Menu" className="text-2xl">☰</button>
        <span className="font-display font-bold">De Sneppe · Beheer</span>
      </div>
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex-col bg-ink text-white lg:flex ${open ? 'flex' : 'hidden'}`}>
        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <Image src="/logo-wit.png" alt="" width={40} height={40} className="h-10 w-auto" />
          <div><p className="font-display font-bold leading-tight">DE SNEPPE</p><p className="text-xs text-white/60">Beheer</p></div>
          <button className="ml-auto text-xl lg:hidden" onClick={() => setOpen(false)} aria-label="Sluiten">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="border-t border-white/10 p-4 text-sm">
          <p className="text-white/60">Aangemeld als</p>
          <p className="font-medium">{naam}</p>
          <button className="mt-2 text-white/60 underline hover:text-white" onClick={async () => { await vraag('/api/admin/logout', 'POST'); router.push('/admin/login') }}>Afmelden</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  )
}
