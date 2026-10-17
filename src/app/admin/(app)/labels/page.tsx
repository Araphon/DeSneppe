'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import Modal, { Bevestig } from '@/components/Modal'
import FotoUpload from '@/components/admin/FotoUpload'
import { Melding, PaginaKop, useMelding } from '@/components/admin/ui'

type Label = { id?: string; naam: string; afbeelding: string | null; kleur: string; aantal?: number }

export default function Labels() {
  const [lijst, setLijst] = useState<Label[] | null>(null)
  const [bewerk, setBewerk] = useState<Label | null>(null)
  const [weg, setWeg] = useState<Label | null>(null)
  const melding = useMelding()
  const laad = () => vraag<Label[]>('/api/admin/labels').then(setLijst)
  useEffect(() => { laad() }, [])
  return (
    <>
      <PaginaKop titel="Labels" sub="Ronde icoontjes achter de productnaam, bv. Vegan of Hot 🌶️">
        <button className="btn-brand" onClick={() => setBewerk({ naam: '', afbeelding: null, kleur: '#16a34a' })}>+ Nieuw label</button>
      </PaginaKop>
      {!lijst ? <p className="text-ink/50">Laden…</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lijst.map(l => (
            <div key={l.id} className="card flex items-center gap-4 p-4">
              {l.afbeelding ? <Image src={l.afbeelding} alt="" width={48} height={48} className="h-12 w-12" /> : <span className="h-12 w-12 rounded-full" style={{ background: l.kleur }} />}
              <div className="flex-1"><p className="font-semibold">{l.naam}</p><p className="text-sm text-ink/60">{l.aantal} product{l.aantal === 1 ? '' : 'en'}</p></div>
              <button className="btn-ghost btn-sm" onClick={() => setBewerk(l)}>Bewerken</button>
              <button className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50" onClick={() => setWeg(l)} aria-label="Verwijderen">🗑</button>
            </div>
          ))}
        </div>
      )}
      {bewerk && (
        <Modal titel={bewerk.id ? 'Label bewerken' : 'Nieuw label'} onSluit={() => setBewerk(null)}>
          <form className="space-y-4" onSubmit={async e => {
            e.preventDefault()
            try {
              if (bewerk.id) await vraag(`/api/admin/labels/${bewerk.id}`, 'PUT', bewerk)
              else await vraag('/api/admin/labels', 'POST', bewerk)
              setBewerk(null); laad(); melding.ok('Opgeslagen')
            } catch (err) { melding.fout((err as Error).message) }
          }}>
            <div><label className="label" htmlFor="ln">Naam</label><input id="ln" className="input" required value={bewerk.naam} onChange={e => setBewerk({ ...bewerk, naam: e.target.value })} /></div>
            <div><span className="label">Icoon (PNG)</span><FotoUpload map="labels" rond grootte={96} waarde={bewerk.afbeelding} onChange={afbeelding => setBewerk({ ...bewerk, afbeelding })} /></div>
            <div><label className="label" htmlFor="lk">Kleur (als er geen icoon is)</label><input id="lk" type="color" className="h-10 w-20 rounded-lg border border-ink/15" value={bewerk.kleur} onChange={e => setBewerk({ ...bewerk, kleur: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setBewerk(null)}>Annuleren</button><button className="btn-brand">Opslaan</button></div>
          </form>
        </Modal>
      )}
      {weg && <Bevestig titel="Label verwijderen?" gevaarlijk knop="Verwijderen" tekst={<>“{weg.naam}” wordt verwijderd{weg.aantal ? ` en verdwijnt bij ${weg.aantal} product${weg.aantal === 1 ? '' : 'en'}` : ''}.</>}
        onNee={() => setWeg(null)} onJa={async () => { await vraag(`/api/admin/labels/${weg.id}`, 'DELETE'); setWeg(null); laad(); melding.ok('Label verwijderd') }} />}
      <Melding m={melding.m} />
    </>
  )
}
