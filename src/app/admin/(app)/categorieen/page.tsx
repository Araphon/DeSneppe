'use client'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import Modal from '@/components/Modal'
import { Melding, PaginaKop, Switch, useMelding } from '@/components/admin/ui'

type Cat = { id: string; naam: string; omschrijving: string | null; zichtbaar: boolean; aantal: number }

export default function Categorieen() {
  const [lijst, setLijst] = useState<Cat[] | null>(null)
  const [bewerk, setBewerk] = useState<Partial<Cat> | null>(null)
  const [verwijder, setVerwijder] = useState<Cat | null>(null)
  const [actie, setActie] = useState<'verplaatsen' | 'verwijderen'>('verplaatsen')
  const [naar, setNaar] = useState('')
  const melding = useMelding()
  const laad = () => vraag<Cat[]>('/api/admin/categorieen').then(setLijst)
  useEffect(() => { laad() }, [])

  async function verplaats(i: number, d: number) {
    if (!lijst) return
    const n = [...lijst]; const j = i + d; if (j < 0 || j >= n.length) return
    ;[n[i], n[j]] = [n[j], n[i]]; setLijst(n)
    await vraag('/api/admin/categorieen', 'PUT', { ids: n.map(c => c.id) })
  }

  return (
    <>
      <PaginaKop titel="Categorieën" sub="De volgorde hier is de volgorde in de shop.">
        <button className="btn-brand" onClick={() => setBewerk({ naam: '', omschrijving: '', zichtbaar: true })}>+ Nieuwe categorie</button>
      </PaginaKop>
      {!lijst ? <p className="text-ink/50">Laden…</p> : (
        <div className="card divide-y divide-ink/5">
          {lijst.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-3 p-4 ${!c.zichtbaar ? 'opacity-60' : ''}`}>
              <div className="flex flex-col">
                <button className="px-2 leading-none hover:text-brand disabled:opacity-20" disabled={i === 0} onClick={() => verplaats(i, -1)} aria-label="Omhoog">▲</button>
                <button className="px-2 leading-none hover:text-brand disabled:opacity-20" disabled={i === lijst.length - 1} onClick={() => verplaats(i, 1)} aria-label="Omlaag">▼</button>
              </div>
              <div className="flex-1">
                <p className="font-semibold">{c.naam} {!c.zichtbaar && <span className="ml-1 rounded bg-ink/10 px-1.5 text-xs font-normal">verborgen</span>}</p>
                <p className="text-sm text-ink/60">{c.aantal} product{c.aantal === 1 ? '' : 'en'}{c.omschrijving ? ` · ${c.omschrijving}` : ''}</p>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => setBewerk(c)}>Bewerken</button>
              <button className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50" aria-label="Verwijderen" onClick={() => { setVerwijder(c); setActie('verplaatsen'); setNaar(lijst.find(x => x.id !== c.id)?.id || '') }}>🗑</button>
            </div>
          ))}
        </div>
      )}

      {bewerk && (
        <Modal titel={bewerk.id ? 'Categorie bewerken' : 'Nieuwe categorie'} onSluit={() => setBewerk(null)}>
          <form className="space-y-3" onSubmit={async e => {
            e.preventDefault()
            try {
              if (bewerk.id) await vraag(`/api/admin/categorieen/${bewerk.id}`, 'PUT', bewerk)
              else await vraag('/api/admin/categorieen', 'POST', bewerk)
              setBewerk(null); laad(); melding.ok('Opgeslagen')
            } catch (err) { melding.fout((err as Error).message) }
          }}>
            <div><label className="label" htmlFor="cn">Naam</label><input id="cn" className="input" autoFocus required value={bewerk.naam || ''} onChange={e => setBewerk({ ...bewerk, naam: e.target.value })} /></div>
            <div><label className="label" htmlFor="co">Omschrijving (optioneel)</label><input id="co" className="input" value={bewerk.omschrijving || ''} onChange={e => setBewerk({ ...bewerk, omschrijving: e.target.value })} /></div>
            {bewerk.id && <label className="flex items-center justify-between"><span className="font-medium">Zichtbaar in de shop</span><Switch aan={bewerk.zichtbaar !== false} onChange={v => setBewerk({ ...bewerk, zichtbaar: v })} /></label>}
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setBewerk(null)}>Annuleren</button><button className="btn-brand">Opslaan</button></div>
          </form>
        </Modal>
      )}

      {verwijder && (
        <Modal titel={`“${verwijder.naam}” verwijderen`} onSluit={() => setVerwijder(null)}>
          {verwijder.aantal === 0 ? <p className="text-ink/70">Deze categorie is leeg en wordt verwijderd.</p> : (
            <>
              <p className="mb-4 text-ink/70">Deze categorie bevat nog <strong>{verwijder.aantal} product{verwijder.aantal === 1 ? '' : 'en'}</strong>. Wat wil je daarmee doen?</p>
              <label className={`mb-2 flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${actie === 'verplaatsen' ? 'border-brand bg-brand-light/40' : 'border-ink/10'}`}>
                <input type="radio" className="mt-1 h-4 w-4 accent-brand" checked={actie === 'verplaatsen'} onChange={() => setActie('verplaatsen')} />
                <span className="flex-1"><span className="font-semibold">Verplaatsen naar een andere categorie</span>
                  {actie === 'verplaatsen' && <select className="input mt-2" value={naar} onChange={e => setNaar(e.target.value)}>{lijst?.filter(c => c.id !== verwijder.id).map(c => <option key={c.id} value={c.id}>{c.naam}</option>)}</select>}
                </span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${actie === 'verwijderen' ? 'border-red-400 bg-red-50' : 'border-ink/10'}`}>
                <input type="radio" className="mt-1 h-4 w-4 accent-red-600" checked={actie === 'verwijderen'} onChange={() => setActie('verwijderen')} />
                <span><span className="font-semibold">Producten ook verwijderen</span><span className="block text-sm text-ink/60">Kan niet ongedaan gemaakt worden</span></span>
              </label>
            </>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setVerwijder(null)}>Annuleren</button>
            <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={async () => {
              try { await vraag(`/api/admin/categorieen/${verwijder.id}`, 'DELETE', { actie, naarId: naar }); setVerwijder(null); laad(); melding.ok('Categorie verwijderd') }
              catch (err) { melding.fout((err as Error).message) }
            }}>Verwijderen</button>
          </div>
        </Modal>
      )}
      <Melding m={melding.m} />
    </>
  )
}
