'use client'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import Modal, { Bevestig } from '@/components/Modal'
import FotoUpload from '@/components/admin/FotoUpload'
import VoucherScanner from '@/components/admin/VoucherScanner'
import { Melding, PaginaKop, Switch, useMelding } from '@/components/admin/ui'

type Beloning = { id?: string; naam: string; omschrijving: string | null; punten: number; afbeelding: string | null; actief: boolean; _count?: { vouchers: number } }
type Voucher = { id: string; code: string; status: string; punten: number; aangemaaktOp: string; ingewisseldOp: string | null; beloning: { naam: string }; klant: { voornaam: string; naam: string } }
const STATUS: Record<string, string> = { OPEN: 'Open', INGEWISSELD: 'Ingewisseld', GEANNULEERD: 'Geannuleerd' }

export default function Loyalty() {
  const [d, setD] = useState<{ beloningen: Beloning[]; vouchers: Voucher[]; totaalPunten: number; aantalKlanten: number } | null>(null)
  const [bewerk, setBewerk] = useState<Beloning | null>(null)
  const [weg, setWeg] = useState<Beloning | null>(null)
  const melding = useMelding()
  const laad = () => vraag<typeof d>('/api/admin/beloningen').then(setD)
  useEffect(() => { laad() }, [])
  return (
    <>
      <PaginaKop titel="Loyaltyprogramma" sub="Klanten sparen punten op producten waar loyalty aanstaat (instellen per product).">
        <button className="btn-brand" onClick={() => setBewerk({ naam: '', omschrijving: '', punten: 500, afbeelding: null, actief: true })}>+ Beloning</button>
      </PaginaKop>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4"><p className="text-sm text-ink/60">Openstaande punten</p><p className="font-display text-3xl font-bold">{d?.totaalPunten ?? '–'}</p></div>
            <div className="card p-4"><p className="text-sm text-ink/60">Klanten</p><p className="font-display text-3xl font-bold">{d?.aantalKlanten ?? '–'}</p></div>
          </div>
          <section>
            <h2 className="mb-3 font-display text-xl font-bold">Beloningen</h2>
            <div className="card divide-y divide-ink/5">
              {d?.beloningen.map(b => (
                <div key={b.id} className={`flex items-center gap-4 p-4 ${!b.actief ? 'opacity-50' : ''}`}>
                  {b.afbeelding ? <img src={b.afbeelding} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-xl bg-sand text-xl">🎁</span>}
                  <div className="flex-1"><p className="font-semibold">{b.naam}</p><p className="text-sm text-ink/60">{b.punten} punten · {b._count?.vouchers || 0}× ingewisseld</p></div>
                  <button className="btn-ghost btn-sm" onClick={() => setBewerk(b)}>Bewerken</button>
                  <button className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50" onClick={() => setWeg(b)} aria-label="Verwijderen">🗑</button>
                </div>
              ))}
              {d && !d.beloningen.length && <p className="p-6 text-center text-ink/50">Nog geen beloningen. Bv. 500 punten = gratis broodje, 1000 punten = Sneppe-draagtas.</p>}
            </div>
          </section>
          <section>
            <h2 className="mb-3 font-display text-xl font-bold">Recente vouchers</h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-ink/5">
                  {d?.vouchers.map(v => (
                    <tr key={v.id}><td className="p-3 font-mono">{v.code}</td><td className="p-3">{v.klant.voornaam} {v.klant.naam}</td><td className="p-3">{v.beloning.naam}</td><td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.status === 'OPEN' ? 'bg-brand-light text-brand-dark' : v.status === 'INGEWISSELD' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink/10'}`}>{STATUS[v.status]}</span></td></tr>
                  ))}
                  {d && !d.vouchers.length && <tr><td className="p-6 text-center text-ink/50">Nog geen vouchers.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <div><VoucherScanner /></div>
      </div>
      {bewerk && (
        <Modal titel={bewerk.id ? 'Beloning bewerken' : 'Nieuwe beloning'} onSluit={() => setBewerk(null)}>
          <form className="space-y-3" onSubmit={async e => {
            e.preventDefault()
            try {
              if (bewerk.id) await vraag(`/api/admin/beloningen/${bewerk.id}`, 'PUT', bewerk); else await vraag('/api/admin/beloningen', 'POST', bewerk)
              setBewerk(null); laad(); melding.ok('Opgeslagen')
            } catch (err) { melding.fout((err as Error).message) }
          }}>
            <div><label className="label" htmlFor="bn">Naam</label><input id="bn" className="input" required value={bewerk.naam} onChange={e => setBewerk({ ...bewerk, naam: e.target.value })} placeholder="Bv. Gratis broodje naar keuze" /></div>
            <div><label className="label" htmlFor="bp">Aantal punten</label><input id="bp" type="number" min={1} className="input" required value={bewerk.punten} onChange={e => setBewerk({ ...bewerk, punten: Number(e.target.value) })} /></div>
            <div><label className="label" htmlFor="bo">Omschrijving (optioneel)</label><input id="bo" className="input" value={bewerk.omschrijving || ''} onChange={e => setBewerk({ ...bewerk, omschrijving: e.target.value })} /></div>
            <div><span className="label">Foto (optioneel)</span><FotoUpload map="beloningen" grootte={96} waarde={bewerk.afbeelding} onChange={afbeelding => setBewerk({ ...bewerk, afbeelding })} /></div>
            <label className="flex items-center justify-between"><span className="font-medium">Actief</span><Switch aan={bewerk.actief} onChange={actief => setBewerk({ ...bewerk, actief })} /></label>
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setBewerk(null)}>Annuleren</button><button className="btn-brand">Opslaan</button></div>
          </form>
        </Modal>
      )}
      {weg && <Bevestig titel="Beloning verwijderen?" gevaarlijk knop="Verwijderen" tekst={<>“{weg.naam}” wordt verwijderd. Als er al vouchers voor bestaan, wordt ze enkel gedeactiveerd en vervallen openstaande vouchers.</>}
        onNee={() => setWeg(null)} onJa={async () => { await vraag(`/api/admin/beloningen/${weg.id}`, 'DELETE'); setWeg(null); laad(); melding.ok('Verwijderd') }} />}
      <Melding m={melding.m} />
    </>
  )
}
