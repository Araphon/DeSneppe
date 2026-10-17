'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import Modal from '@/components/Modal'
import { Melding, Switch, useMelding } from '@/components/admin/ui'
import { euro } from '@/lib/geld'

type Klant = { id: string; noShows: number; alleenOnline: boolean; geblokkeerd: boolean; voornaam: string; naam: string; email: string; telefoon: string; adres: string; postcode: string; gemeente: string; geboortedatum: string | null; punten: number; aangemaaktOp: string; mailBestelling: boolean; mailNieuws: boolean; mailActies: boolean
  bestellingen: { id: string; nummer: number; afhaalTijd: string; totaalCent: number; status: string }[]; transacties: { id: string; punten: number; reden: string; aangemaaktOp: string }[] }
const dt = (s: string) => new Date(s).toLocaleString('nl-BE', { timeZone: 'Europe/Brussels', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function KlantDetail({ params }: { params: { id: string } }) {
  const [k, setK] = useState<Klant | null>(null)
  const [corr, setCorr] = useState(false)
  const [pt, setPt] = useState(0)
  const [reden, setReden] = useState('')
  const melding = useMelding()
  const laad = () => vraag<Klant>(`/api/admin/klanten/${params.id}`).then(setK)
  useEffect(() => { laad() }, [params.id])
  if (!k) return <p className="text-ink/50">Laden…</p>
  return (
    <>
      <Link href="/admin/klanten" className="btn-ghost btn-sm mb-4">← Klanten</Link>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="card p-5">
          <h1 className="h-display text-2xl">{k.voornaam} {k.naam}</h1>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-ink/60">E-mail</dt><dd><a className="underline" href={`mailto:${k.email}`}>{k.email}</a></dd>
            <dt className="text-ink/60">Telefoon</dt><dd><a className="underline" href={`tel:${k.telefoon}`}>{k.telefoon}</a></dd>
            <dt className="text-ink/60">Adres</dt><dd>{k.adres}, {k.postcode} {k.gemeente}</dd>
            <dt className="text-ink/60">Geboortedatum</dt><dd>{k.geboortedatum ? new Date(k.geboortedatum).toLocaleDateString('nl-BE', { timeZone: 'UTC' }) : '–'}</dd>
            <dt className="text-ink/60">Klant sinds</dt><dd>{dt(k.aangemaaktOp)}</dd>
            <dt className="text-ink/60">Meldingen</dt><dd>{[k.mailBestelling && 'bestelstatus', k.mailActies && 'acties', k.mailNieuws && 'nieuws'].filter(Boolean).join(', ') || 'geen'}</dd>
          </dl>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between"><div><p className="text-sm text-ink/60">Spaarpunten</p><p className="font-display text-4xl font-bold">{k.punten}</p></div><button className="btn-ghost btn-sm" onClick={() => setCorr(true)}>Punten corrigeren</button></div>
          <ul className="mt-4 max-h-60 divide-y divide-ink/5 overflow-y-auto text-sm">
            {k.transacties.map(t => <li key={t.id} className="flex justify-between py-2"><span>{t.reden}<span className="block text-xs text-ink/50">{dt(t.aangemaaktOp)}</span></span><span className={t.punten < 0 ? 'text-red-600' : 'text-emerald-700'}>{t.punten > 0 ? '+' : ''}{t.punten}</span></li>)}
          </ul>
        </div>
      </div>
      <div className="card mt-5 p-5">
        <h2 className="font-display text-lg font-bold">Betrouwbaarheid</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p><span className={`font-display text-3xl font-bold ${k.noShows ? 'text-red-600' : ''}`}>{k.noShows}</span> <span className="text-ink/60">niet afgehaalde bestelling{k.noShows === 1 ? '' : 'en'} (betaling aan de kassa)</span></p>
          {k.noShows > 0 && <button className="btn-ghost btn-sm" onClick={async () => { await vraag(`/api/admin/klanten/${k.id}`, 'PUT', { noShowsReset: true }); laad(); melding.ok('No-shows teruggezet') }}>Terugzetten naar 0</button>}
        </div>
        <div className="mt-3 divide-y divide-ink/5">
          <label className="flex items-center justify-between gap-3 py-2"><span><span className="block font-medium">Enkel nog online betalen</span><span className="text-sm text-ink/60">Betalen bij afhalen niet meer toestaan</span></span><Switch aan={k.alleenOnline} onChange={async v => { await vraag(`/api/admin/klanten/${k.id}`, 'PUT', { alleenOnline: v }); laad() }} /></label>
          <label className="flex items-center justify-between gap-3 py-2"><span><span className="block font-medium text-red-700">Account blokkeren</span><span className="text-sm text-ink/60">Kan niet meer bestellen (bv. valse bestellingen)</span></span><Switch aan={k.geblokkeerd} onChange={async v => { await vraag(`/api/admin/klanten/${k.id}`, 'PUT', { geblokkeerd: v }); laad() }} /></label>
        </div>
      </div>
      <h2 className="mb-3 mt-8 font-display text-xl font-bold">Bestellingen</h2>
      <div className="card divide-y divide-ink/5 text-sm">
        {k.bestellingen.map(b => <div key={b.id} className="flex justify-between p-3"><span>#{b.nummer} · {dt(b.afhaalTijd)}</span><span>{b.status.toLowerCase()} · <strong>{euro(b.totaalCent)}</strong></span></div>)}
        {!k.bestellingen.length && <p className="p-6 text-center text-ink/50">Nog geen bestellingen.</p>}
      </div>
      {corr && (
        <Modal titel="Punten corrigeren" onSluit={() => setCorr(false)}>
          <form className="space-y-3" onSubmit={async e => { e.preventDefault(); try { await vraag(`/api/admin/klanten/${k.id}`, 'POST', { punten: pt, reden }); setCorr(false); laad(); melding.ok('Punten aangepast') } catch (err) { melding.fout((err as Error).message) } }}>
            <div><label className="label" htmlFor="pt">Punten (+ of −)</label><input id="pt" type="number" className="input" value={pt} onChange={e => setPt(Number(e.target.value))} /></div>
            <div><label className="label" htmlFor="rd">Reden</label><input id="rd" className="input" value={reden} onChange={e => setReden(e.target.value)} placeholder="Bv. Bestelling aan de toog" /></div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setCorr(false)}>Annuleren</button><button className="btn-brand">Opslaan</button></div>
          </form>
        </Modal>
      )}
      <Melding m={melding.m} />
    </>
  )
}
