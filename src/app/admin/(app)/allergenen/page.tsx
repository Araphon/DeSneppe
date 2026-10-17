'use client'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import Modal, { Bevestig } from '@/components/Modal'
import { Melding, PaginaKop, useMelding } from '@/components/admin/ui'
import EmojiKiezer from '@/components/admin/EmojiKiezer'

type A = { id?: string; naam: string; icoon: string | null; wettelijk?: boolean; aantal?: number }

export default function Allergenen() {
  const [lijst, setLijst] = useState<A[] | null>(null)
  const [bewerk, setBewerk] = useState<A | null>(null)
  const [weg, setWeg] = useState<A | null>(null)
  const melding = useMelding()
  const laad = () => vraag<A[]>('/api/admin/allergenen').then(setLijst)
  useEffect(() => { laad() }, [])
  const rij = (a: A) => (
    <div key={a.id} className="flex items-center gap-3 p-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-sand text-lg">{a.icoon || '•'}</span>
      <div className="flex-1"><p className="font-semibold">{a.naam}</p><p className="text-xs text-ink/50">{a.aantal} product{a.aantal === 1 ? '' : 'en'}</p></div>
      <button className="btn-ghost btn-sm" onClick={() => setBewerk(a)}>{a.wettelijk ? 'Icoon' : 'Bewerken'}</button>
      {!a.wettelijk && <button className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50" onClick={() => setWeg(a)} aria-label="Verwijderen">🗑</button>}
    </div>
  )
  return (
    <>
      <PaginaKop titel="Allergenen" sub="De 14 wettelijke allergenen staan er altijd. Voeg zelf andere toe (bv. kiwi, koriander).">
        <button className="btn-brand" onClick={() => setBewerk({ naam: '', icoon: '' })}>+ Ander allergeen</button>
      </PaginaKop>
      {lijst && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section><h2 className="mb-2 font-display text-lg font-bold">Wettelijke allergenen (EU)</h2><div className="card divide-y divide-ink/5">{lijst.filter(a => a.wettelijk).map(rij)}</div></section>
          <section><h2 className="mb-2 font-display text-lg font-bold">Eigen allergenen</h2><div className="card divide-y divide-ink/5">{lijst.filter(a => !a.wettelijk).map(rij)}{!lijst.some(a => !a.wettelijk) && <p className="p-6 text-center text-sm text-ink/50">Nog geen eigen allergenen.</p>}</div></section>
        </div>
      )}
      {bewerk && (
        <Modal titel={bewerk.id ? bewerk.naam : 'Ander allergeen'} onSluit={() => setBewerk(null)}>
          <form className="space-y-3" onSubmit={async e => {
            e.preventDefault()
            try { if (bewerk.id) await vraag(`/api/admin/allergenen/${bewerk.id}`, 'PUT', bewerk); else await vraag('/api/admin/allergenen', 'POST', bewerk); setBewerk(null); laad(); melding.ok('Opgeslagen') }
            catch (err) { melding.fout((err as Error).message) }
          }}>
            {!bewerk.wettelijk && <div><label className="label" htmlFor="an">Naam</label><input id="an" className="input" required value={bewerk.naam} onChange={e => setBewerk({ ...bewerk, naam: e.target.value })} /></div>}
            <div><span className="label">Icoon (optioneel)</span><EmojiKiezer waarde={bewerk.icoon} onChange={icoon => setBewerk({ ...bewerk, icoon })} /></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setBewerk(null)}>Annuleren</button><button className="btn-brand">Opslaan</button></div>
          </form>
        </Modal>
      )}
      {weg && <Bevestig titel="Allergeen verwijderen?" gevaarlijk knop="Verwijderen" tekst={<>“{weg.naam}” verdwijnt ook bij {weg.aantal} product{weg.aantal === 1 ? '' : 'en'}.</>} onNee={() => setWeg(null)} onJa={async () => { await vraag(`/api/admin/allergenen/${weg.id}`, 'DELETE'); setWeg(null); laad(); melding.ok('Verwijderd') }} />}
      <Melding m={melding.m} />
    </>
  )
}
