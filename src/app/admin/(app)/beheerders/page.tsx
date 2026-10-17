'use client'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import Modal, { Bevestig } from '@/components/Modal'
import { Kaart, Melding, PaginaKop, Switch, useMelding } from '@/components/admin/ui'

type Beheerder = { id: string; naam: string; email: string; actief: boolean; laatsteLogin: string | null; uitgenodigd: boolean; uitnodigingVerlopen: boolean; ikZelf: boolean }
type Uitnodiging = { link: string; verstuurd: boolean }
const dt = (s: string) => new Date(s).toLocaleString('nl-BE', { timeZone: 'Europe/Brussels', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function Beheerders() {
  const [lijst, setLijst] = useState<Beheerder[] | null>(null)
  const [nieuw, setNieuw] = useState<{ naam: string; email: string } | null>(null)
  const [link, setLink] = useState<(Uitnodiging & { naam: string }) | null>(null)
  const [weg, setWeg] = useState<Beheerder | null>(null)
  const [ww, setWw] = useState({ huidig: '', nieuw: '' })
  const melding = useMelding()
  const laad = () => vraag<Beheerder[]>('/api/admin/beheerders').then(setLijst)
  useEffect(() => { laad() }, [])

  return (
    <>
      <PaginaKop titel="Beheerders" sub="Wie mag de admin en de kassa gebruiken?">
        <button className="btn-brand" onClick={() => setNieuw({ naam: '', email: '' })}>+ Beheerder uitnodigen</button>
      </PaginaKop>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="card divide-y divide-ink/5">
          {lijst?.map(a => (
            <div key={a.id} className={`flex flex-wrap items-center gap-3 p-4 ${!a.actief ? 'opacity-50' : ''}`}>
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-sand font-display font-bold">{a.naam.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.naam} {a.ikZelf && <span className="ml-1 rounded bg-ink px-1.5 text-xs font-normal text-white">jij</span>}</p>
                <p className="truncate text-sm text-ink/60">{a.email}</p>
                <p className="text-xs text-ink/50">
                  {a.uitgenodigd ? (a.uitnodigingVerlopen ? '⚠️ Uitnodiging verlopen' : '✉️ Uitgenodigd — nog geen wachtwoord gekozen') : a.laatsteLogin ? `Laatst aangemeld ${dt(a.laatsteLogin)}` : 'Nog niet aangemeld'}
                </p>
              </div>
              {a.uitgenodigd && <button className="btn-ghost btn-sm" onClick={async () => {
                try { const r = await vraag<Uitnodiging>(`/api/admin/beheerders/${a.id}`, 'PUT', { opnieuwUitnodigen: true }); setLink({ ...r, naam: a.naam }) } catch (e) { melding.fout((e as Error).message) }
              }}>Opnieuw uitnodigen</button>}
              {!a.ikZelf && (
                <label className="flex items-center gap-2 text-sm">Actief<Switch aan={a.actief} label={`${a.naam} actief`} onChange={async actief => {
                  try { await vraag(`/api/admin/beheerders/${a.id}`, 'PUT', { actief }); laad() } catch (e) { melding.fout((e as Error).message) }
                }} /></label>
              )}
              {!a.ikZelf && <button className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50" onClick={() => setWeg(a)} aria-label="Verwijderen">🗑</button>}
            </div>
          ))}
        </div>

        <Kaart titel="Mijn wachtwoord wijzigen">
          <form className="space-y-3" onSubmit={async e => {
            e.preventDefault()
            try { await vraag('/api/admin/wachtwoord', 'PUT', ww); setWw({ huidig: '', nieuw: '' }); melding.ok('Wachtwoord gewijzigd') } catch (err) { melding.fout((err as Error).message) }
          }}>
            <div><label className="label" htmlFor="hw">Huidig wachtwoord</label><input id="hw" type="password" className="input" required autoComplete="current-password" value={ww.huidig} onChange={e => setWw({ ...ww, huidig: e.target.value })} /></div>
            <div><label className="label" htmlFor="nw">Nieuw wachtwoord</label><input id="nw" type="password" className="input" required minLength={10} autoComplete="new-password" value={ww.nieuw} onChange={e => setWw({ ...ww, nieuw: e.target.value })} /><p className="mt-1 text-xs text-ink/50">Minstens 10 tekens</p></div>
            <button className="btn-ink w-full">Wachtwoord wijzigen</button>
          </form>
        </Kaart>
      </div>

      {nieuw && (
        <Modal titel="Beheerder uitnodigen" onSluit={() => setNieuw(null)}>
          <form className="space-y-3" onSubmit={async e => {
            e.preventDefault()
            try { const r = await vraag<Uitnodiging>('/api/admin/beheerders', 'POST', nieuw); setLink({ ...r, naam: nieuw.naam }); setNieuw(null); laad() } catch (err) { melding.fout((err as Error).message) }
          }}>
            <p className="text-sm text-ink/60">De nieuwe beheerder krijgt een link om zelf een wachtwoord te kiezen.</p>
            <div><label className="label" htmlFor="bn">Naam</label><input id="bn" className="input" required autoFocus value={nieuw.naam} onChange={e => setNieuw({ ...nieuw, naam: e.target.value })} /></div>
            <div><label className="label" htmlFor="be">E-mailadres</label><input id="be" type="email" className="input" required value={nieuw.email} onChange={e => setNieuw({ ...nieuw, email: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setNieuw(null)}>Annuleren</button><button className="btn-brand">Uitnodigen</button></div>
          </form>
        </Modal>
      )}
      {link && (
        <Modal titel="Uitnodiging klaar" onSluit={() => setLink(null)}>
          <p className="text-ink/70">{link.verstuurd ? `${link.naam} kreeg een e-mail met de uitnodiging.` : `De e-mail kon niet verstuurd worden. Bezorg ${link.naam} deze link (7 dagen geldig):`}</p>
          <div className="mt-3 flex gap-2">
            <input readOnly className="input font-mono text-xs" value={link.link} onFocus={e => e.target.select()} />
            <button className="btn-ink btn-sm" onClick={() => { navigator.clipboard?.writeText(link.link); melding.ok('Link gekopieerd') }}>Kopieer</button>
          </div>
          <div className="mt-5 flex justify-end"><button className="btn-brand" onClick={() => setLink(null)}>Klaar</button></div>
        </Modal>
      )}
      {weg && <Bevestig titel="Beheerder verwijderen?" gevaarlijk knop="Verwijderen" tekst={<>{weg.naam} ({weg.email}) kan dan niet meer aanmelden. Tip: je kan iemand ook tijdelijk deactiveren.</>}
        onNee={() => setWeg(null)} onJa={async () => { try { await vraag(`/api/admin/beheerders/${weg.id}`, 'DELETE'); laad(); melding.ok('Verwijderd') } catch (e) { melding.fout((e as Error).message) } setWeg(null) }} />}
      <Melding m={melding.m} />
    </>
  )
}
