'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import BestelBord from './BestelBord'
import VoucherScanner from './VoucherScanner'
import PauzeModal from './PauzeModal'
import UitverkochtModal, { type UitverkochtModus } from './UitverkochtModal'
import { Switch } from './ui'
import { vraag } from '../fetcher'
import type { Ontwerpen, PrinterConfig } from '../print'
import KassaBrug from '../app/KassaBrug'

type Rij = { id: string; naam: string; afbeelding: string | null; categorie: string; uitverkocht: boolean; zichtbaar: boolean }

function Klok() {
  const [t, setT] = useState('')
  useEffect(() => { const f = () => setT(new Intl.DateTimeFormat('nl-BE', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit' }).format(new Date())); f(); const i = setInterval(f, 10000); return () => clearInterval(i) }, [])
  return <span className="font-display text-xl font-bold tabular-nums">{t}</span>
}

function Voorraad() {
  const [rijen, setRijen] = useState<Rij[] | null>(null)
  const [uit, setUit] = useState<Rij | null>(null)
  const [zoek, setZoek] = useState('')
  const laad = () => vraag<Rij[]>('/api/admin/producten').then(r => setRijen(r.filter(x => x.zichtbaar)))
  useEffect(() => { laad() }, [])
  const zet = async (r: Rij, modus: UitverkochtModus | 'terug', tot?: string) => { await vraag(`/api/admin/producten/${r.id}/uitverkocht`, 'PUT', { modus, tot }); setUit(null); laad() }
  const cats = Array.from(new Set((rijen || []).map(r => r.categorie)))
  const zicht = (rijen || []).filter(r => !zoek || r.naam.toLowerCase().includes(zoek.toLowerCase()))
  return (
    <div>
      <input className="input mb-4 max-w-sm" placeholder="Zoek product…" value={zoek} onChange={e => setZoek(e.target.value)} />
      {cats.map(c => zicht.some(r => r.categorie === c) && (
        <section key={c} className="mb-6">
          <h2 className="mb-2 font-display text-lg font-bold">{c}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {zicht.filter(r => r.categorie === c).map(r => (
              <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded-xl bg-white p-2.5 shadow-card ${r.uitverkocht ? 'opacity-60' : ''}`}>
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sand">{r.afbeelding && <Image src={r.afbeelding} alt="" fill sizes="48px" className={`object-cover ${r.uitverkocht ? 'grayscale' : ''}`} />}</span>
                <span className="min-w-0 flex-1 text-sm font-semibold leading-tight">{r.naam}{r.uitverkocht && <span className="block text-xs font-medium text-brand-dark">Uitverkocht</span>}</span>
                <Switch aan={!r.uitverkocht} label={r.naam} onChange={aan => aan ? zet(r, 'terug') : setUit(r)} />
              </label>
            ))}
          </div>
        </section>
      ))}
      {uit && <UitverkochtModal naam={uit.naam} onSluit={() => setUit(null)} onKies={(m, t) => zet(uit, m, t)} />}
    </div>
  )
}

export default function KassaApp({ printers, ontwerp }: { printers: PrinterConfig & { autoPrint: boolean }; ontwerp: Ontwerpen }) {
  const [tab, setTab] = useState<'bestellingen' | 'voorraad' | 'voucher'>('bestellingen')
  const [pauze, setPauze] = useState(false)
  const [status, setStatus] = useState<{ actief: boolean; dicht: number }>({ actief: true, dicht: 0 })
  const laadStatus = () => vraag<{ bestellenActief: boolean; slots: { geblokkeerd: boolean; voorbij: boolean }[] }>('/api/admin/pauze')
    .then(d => setStatus({ actief: d.bestellenActief, dicht: d.slots.filter(s => s.geblokkeerd && !s.voorbij).length })).catch(() => {})
  useEffect(() => { laadStatus(); const t = setInterval(laadStatus, 60000); return () => clearInterval(t) }, [])
  // Scherm wakker houden op de iPad
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const vraagLock = async () => { try { lock = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<typeof lock> } }).wakeLock.request('screen') } catch {} }
    vraagLock()
    const vis = () => document.visibilityState === 'visible' && vraagLock()
    document.addEventListener('visibilitychange', vis)
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release().catch(() => {}) }
  }, [])
  const tabs = [{ k: 'bestellingen', t: '🧾 Bestellingen' }, { k: 'voorraad', t: '🥪 Uitverkocht' }, { k: 'voucher', t: '🎁 Voucher' }] as const
  return (
    <div className="min-h-screen bg-[#F6F3EE]">
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-ink px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <Image src="/logo-wit.png" alt="" width={36} height={36} className="h-9 w-auto" />
        <nav className="flex gap-1">
          {tabs.map(t => <button key={t.k} onClick={() => setTab(t.k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t.k ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10'}`}>{t.t}</button>)}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <button onClick={() => setPauze(true)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${!status.actief ? 'bg-red-600 text-white' : status.dicht ? 'bg-mustard text-ink' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {!status.actief ? '⏸ Bestellen gepauzeerd' : status.dicht ? `⛔ ${status.dicht} kwartier dicht` : '⏸ Pauze'}
          </button>
          <Klok /><Link href="/admin" className="text-sm text-white/60 underline">Beheer</Link></div>
      </header>
      <KassaBrug />
      <main className="p-4 sm:p-5">
        <div className={tab === 'bestellingen' ? '' : 'hidden'}><BestelBord kassa printers={printers} ontwerp={ontwerp} /></div>
        {tab === 'voorraad' && <Voorraad />}
        {tab === 'voucher' && <div className="mx-auto max-w-md"><VoucherScanner /></div>}
      </main>
      {pauze && <PauzeModal onSluit={() => setPauze(false)} onGewijzigd={laadStatus} />}
    </div>
  )
}
