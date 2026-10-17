'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import Modal, { Bevestig } from '@/components/Modal'
import { Melding, PaginaKop, Switch, useMelding } from '@/components/admin/ui'
import { filterTekst, triggerTekst, type Filters } from '@/components/admin/marketingHulp'

type Camp = { id: string; naam: string; type: 'EENMALIG' | 'AUTOMATISCH'; status: string; onderwerp: string; klantgroep: string | null; viaMail: boolean; viaPush: boolean; geplandOp: string | null; herhaling: string; trigger: { soort?: string; dagen?: number; uren?: number } | null; laatstVerzonden: string | null; systeem: boolean; verzonden: number; nietVerzonden: number }
type Ond = { id: string; naam: string; omschrijving: string | null; systeem: boolean; standaardAan: boolean; actief: boolean; mailAan: number; pushAan: number; campagnes: number }
type Groep = { id?: string; naam: string; omschrijving: string | null; filters: Filters; aantal?: number; campagnes?: number }

const STATUS: Record<string, { t: string; k: string }> = {
  CONCEPT: { t: 'Concept', k: 'bg-ink/10' }, GEPLAND: { t: 'Gepland', k: 'bg-sky-100 text-sky-800' }, VERZONDEN: { t: 'Verzonden', k: 'bg-emerald-100 text-emerald-800' },
  ACTIEF: { t: 'Actief', k: 'bg-emerald-100 text-emerald-800' }, GEPAUZEERD: { t: 'Gepauzeerd', k: 'bg-ink/10' },
}
const dt = (s: string) => new Date(s).toLocaleString('nl-BE', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Marketing() {
  const router = useRouter()
  const [tab, setTab] = useState<'campagnes' | 'auto' | 'groepen' | 'onderwerpen'>('campagnes')
  const [camps, setCamps] = useState<Camp[] | null>(null)
  const melding = useMelding()
  const laad = () => vraag<Camp[]>('/api/admin/marketing/campagnes').then(setCamps)
  useEffect(() => { laad(); const h = location.hash.slice(1); if (['campagnes', 'auto', 'groepen', 'onderwerpen'].includes(h)) setTab(h as typeof tab) }, [])
  const nieuw = async (type: 'EENMALIG' | 'AUTOMATISCH') => { const c = await vraag<{ id: string }>('/api/admin/marketing/campagnes', 'POST', { type }); router.push(`/admin/marketing/${c.id}`) }
  const tabs = [{ k: 'campagnes', t: '📣 Campagnes' }, { k: 'auto', t: '⚙️ Automatisaties' }, { k: 'groepen', t: '👥 Klantgroepen' }, { k: 'onderwerpen', t: '🔔 Onderwerpen' }] as const

  return (
    <>
      <PaginaKop titel="Marketing" sub="Mails (en later pushberichten in de app) naar je klanten — enkel over onderwerpen waarvoor ze zelf kozen.">
        {tab === 'campagnes' && <button className="btn-brand" onClick={() => nieuw('EENMALIG')}>+ Nieuwe campagne</button>}
        {tab === 'auto' && <button className="btn-brand" onClick={() => nieuw('AUTOMATISCH')}>+ Nieuwe automatisatie</button>}
      </PaginaKop>
      {<p className="mb-4 rounded-lg bg-mustard/20 p-3 text-sm">ℹ️ Zolang de e-mail nog niet gekoppeld is (na de overname van het domein), worden mails niet echt verstuurd maar wel gelogd. Pushberichten volgen met de app.</p>}
      <div className="no-scrollbar mb-5 flex gap-1 overflow-x-auto">
        {tabs.map(t => <button key={t.k} onClick={() => { setTab(t.k); history.replaceState(null, '', '#' + t.k) }} className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold ${tab === t.k ? 'bg-ink text-white' : 'bg-white hover:bg-sand'}`}>{t.t}</button>)}
      </div>

      {(tab === 'campagnes' || tab === 'auto') && (
        <div className="card divide-y divide-ink/5">
          {camps?.filter(c => (tab === 'auto') === (c.type === 'AUTOMATISCH')).map(c => (
            <Link key={c.id} href={`/admin/marketing/${c.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-cream">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.naam}</p>
                <p className="text-sm text-ink/60">
                  {c.type === 'AUTOMATISCH' ? triggerTekst(c.trigger) : c.status === 'GEPLAND' && c.geplandOp ? `Gepland: ${dt(c.geplandOp)}${c.herhaling !== 'GEEN' ? ` · ${c.herhaling.toLowerCase()}` : ''}` : c.laatstVerzonden ? `Verzonden ${dt(c.laatstVerzonden)}` : 'Nog niet verzonden'}
                  {' · '}{c.onderwerp}{c.klantgroep ? ` · ${c.klantgroep}` : ' · alle klanten'}
                </p>
              </div>
              <span className="text-xs text-ink/50">{c.viaMail && '✉️'}{c.viaPush && ' 📱'}</span>
              <span className="text-sm tabular-nums text-ink/60">{c.verzonden} verzonden{c.nietVerzonden ? ` · ${c.nietVerzonden} niet` : ''}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[c.status]?.k}`}>{STATUS[c.status]?.t}</span>
            </Link>
          ))}
          {camps && !camps.some(c => (tab === 'auto') === (c.type === 'AUTOMATISCH')) && <p className="p-8 text-center text-ink/50">{tab === 'auto' ? 'Nog geen automatisaties.' : 'Nog geen campagnes. Bv. “Nieuw: broodje Tartufo” of “Broodje van de week”.'}</p>}
        </div>
      )}
      {tab === 'groepen' && <Groepen melding={melding} />}
      {tab === 'onderwerpen' && <Onderwerpen melding={melding} />}
      <Melding m={melding.m} />
    </>
  )
}

type MeldingApi = ReturnType<typeof useMelding>

function Onderwerpen({ melding }: { melding: MeldingApi }) {
  const [lijst, setLijst] = useState<Ond[] | null>(null)
  const [bewerk, setBewerk] = useState<Partial<Ond> | null>(null)
  const [weg, setWeg] = useState<Ond | null>(null)
  const laad = () => vraag<Ond[]>('/api/admin/marketing/onderwerpen').then(setLijst)
  useEffect(() => { laad() }, [])
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm text-ink/60">Klanten kiezen in hun account per onderwerp of ze mails en/of app-meldingen willen.</p><button className="btn-ghost btn-sm" onClick={() => setBewerk({ naam: '', omschrijving: '', standaardAan: true })}>+ Onderwerp</button></div>
      <div className="card divide-y divide-ink/5">
        {lijst?.map(o => (
          <div key={o.id} className={`flex flex-wrap items-center gap-3 p-4 ${!o.actief ? 'opacity-50' : ''}`}>
            <div className="min-w-0 flex-1"><p className="font-semibold">{o.naam}{o.systeem && <span className="ml-2 rounded bg-ink/10 px-1.5 text-xs font-normal">systeem</span>}</p><p className="text-sm text-ink/60">{o.omschrijving}</p></div>
            <span className="text-sm tabular-nums text-ink/60" title="Klanten die dit willen ontvangen">✉️ {o.mailAan} · 📱 {o.pushAan}</span>
            <button className="btn-ghost btn-sm" onClick={() => setBewerk(o)}>Bewerken</button>
            {!o.systeem && <button className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50" onClick={() => setWeg(o)} aria-label="Verwijderen">🗑</button>}
          </div>
        ))}
      </div>
      {bewerk && (
        <Modal titel={bewerk.id ? 'Onderwerp bewerken' : 'Nieuw onderwerp'} onSluit={() => setBewerk(null)}>
          <form className="space-y-3" onSubmit={async e => {
            e.preventDefault()
            try { if (bewerk.id) await vraag(`/api/admin/marketing/onderwerpen/${bewerk.id}`, 'PUT', bewerk); else await vraag('/api/admin/marketing/onderwerpen', 'POST', bewerk); setBewerk(null); laad(); melding.ok('Opgeslagen') } catch (err) { melding.fout((err as Error).message) }
          }}>
            <div><label className="label" htmlFor="on">Naam (zoals de klant het ziet)</label><input id="on" className="input" required value={bewerk.naam || ''} onChange={e => setBewerk({ ...bewerk, naam: e.target.value })} /></div>
            <div><label className="label" htmlFor="oo">Korte uitleg</label><input id="oo" className="input" value={bewerk.omschrijving || ''} onChange={e => setBewerk({ ...bewerk, omschrijving: e.target.value })} /></div>
            {!bewerk.systeem && <label className="flex items-center justify-between gap-3"><span><span className="block font-medium">Standaard aan bij nieuwe klanten</span><span className="text-sm text-ink/60">Enkel als de klant bij registratie marketing toestaat</span></span><Switch aan={bewerk.standaardAan !== false} onChange={v => setBewerk({ ...bewerk, standaardAan: v })} /></label>}
            {bewerk.id && !bewerk.systeem && <label className="flex items-center justify-between gap-3"><span className="font-medium">Actief</span><Switch aan={bewerk.actief !== false} onChange={v => setBewerk({ ...bewerk, actief: v })} /></label>}
            <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={() => setBewerk(null)}>Annuleren</button><button className="btn-brand">Opslaan</button></div>
          </form>
        </Modal>
      )}
      {weg && <Bevestig titel="Onderwerp verwijderen?" gevaarlijk knop="Verwijderen" tekst={<>“{weg.naam}” verdwijnt ook uit de meldingsvoorkeuren van je klanten.</>} onNee={() => setWeg(null)} onJa={async () => { try { await vraag(`/api/admin/marketing/onderwerpen/${weg.id}`, 'DELETE'); laad(); melding.ok('Verwijderd') } catch (e) { melding.fout((e as Error).message) } setWeg(null) }} />}
    </>
  )
}

function Groepen({ melding }: { melding: MeldingApi }) {
  const [lijst, setLijst] = useState<Groep[] | null>(null)
  const [bewerk, setBewerk] = useState<Groep | null>(null)
  const [weg, setWeg] = useState<Groep | null>(null)
  const laad = () => vraag<Groep[]>('/api/admin/marketing/groepen').then(setLijst)
  useEffect(() => { laad() }, [])
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm text-ink/60">Een groep is een set voorwaarden. Wie eraan voldoet, verandert vanzelf mee.</p><button className="btn-ghost btn-sm" onClick={() => setBewerk({ naam: '', omschrijving: '', filters: {} })}>+ Klantgroep</button></div>
      <div className="card divide-y divide-ink/5">
        {lijst?.map(g => (
          <div key={g.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1"><p className="font-semibold">{g.naam}</p><p className="text-sm text-ink/60">{filterTekst(g.filters) || 'Alle klanten'}</p></div>
            <span className="text-sm font-semibold tabular-nums">{g.aantal} klant{g.aantal === 1 ? '' : 'en'}</span>
            <button className="btn-ghost btn-sm" onClick={() => setBewerk(g)}>Bewerken</button>
            <button className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50" onClick={() => setWeg(g)} aria-label="Verwijderen">🗑</button>
          </div>
        ))}
        {lijst && !lijst.length && <p className="p-8 text-center text-ink/50">Nog geen klantgroepen. Bv. “Vaste klanten” (10+ bestellingen) of “Al 2 maanden weg”.</p>}
      </div>
      {bewerk && <GroepEditor g={bewerk} onSluit={() => setBewerk(null)} onOpgeslagen={() => { setBewerk(null); laad(); melding.ok('Opgeslagen') }} onFout={melding.fout} />}
      {weg && <Bevestig titel="Klantgroep verwijderen?" gevaarlijk knop="Verwijderen" tekst={<>Campagnes met “{weg.naam}” gaan dan naar alle klanten (met dat onderwerp aan).</>} onNee={() => setWeg(null)} onJa={async () => { await vraag(`/api/admin/marketing/groepen/${weg.id}`, 'DELETE'); setWeg(null); laad(); melding.ok('Verwijderd') }} />}
    </>
  )
}


function GroepEditor({ g: start, onSluit, onOpgeslagen, onFout }: { g: Groep; onSluit: () => void; onOpgeslagen: () => void; onFout: (t: string) => void }) {
  const [g, setG] = useState<Groep>(start)
  const [telling, setTelling] = useState<{ aantal: number; voorbeeld: string[] } | null>(null)
  const [producten, setProducten] = useState<{ id: string; naam: string; categorieId: string; categorie: string }[]>([])
  const f = g.filters
  const zetF = (x: Partial<Filters>) => setG({ ...g, filters: { ...f, ...x } })
  const getal = (v: string) => (v === '' ? null : Math.max(0, Number(v)))
  useEffect(() => { vraag<typeof producten>('/api/admin/producten').then(setProducten) }, [])
  useEffect(() => { const t = setTimeout(() => vraag<{ aantal: number; voorbeeld: string[] }>('/api/admin/marketing/groepen-voorbeeld', 'POST', { filters: f }).then(setTelling).catch(() => {}), 300); return () => clearTimeout(t) }, [f])
  const cats = Array.from(new Map(producten.map(p => [p.categorieId, p.categorie])).entries())
  return (
    <Modal titel={g.id ? 'Klantgroep bewerken' : 'Nieuwe klantgroep'} onSluit={onSluit} breed>
      <form className="space-y-4" onSubmit={async e => {
        e.preventDefault()
        try { if (g.id) await vraag(`/api/admin/marketing/groepen/${g.id}`, 'PUT', g); else await vraag('/api/admin/marketing/groepen', 'POST', g); onOpgeslagen() } catch (err) { onFout((err as Error).message) }
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="gn">Naam</label><input id="gn" className="input" required value={g.naam} onChange={e => setG({ ...g, naam: e.target.value })} placeholder="Bv. Al 2 maanden weg" /></div>
          <div><label className="label" htmlFor="go">Omschrijving</label><input id="go" className="input" value={g.omschrijving || ''} onChange={e => setG({ ...g, omschrijving: e.target.value })} /></div>
        </div>
        <div className="rounded-xl bg-cream p-4">
          <p className="mb-3 font-semibold">Voorwaarden <span className="font-normal text-ink/50">(alle ingevulde voorwaarden moeten kloppen)</span></p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Laatste bestelling langer dan … dagen geleden</label><input type="number" min={0} className="input" value={f.laatsteBestellingMinDagen ?? ''} onChange={e => zetF({ laatsteBestellingMinDagen: getal(e.target.value) })} placeholder="bv. 60" /></div>
            <div><label className="label">Besteld in de laatste … dagen</label><input type="number" min={0} className="input" value={f.laatsteBestellingMaxDagen ?? ''} onChange={e => zetF({ laatsteBestellingMaxDagen: getal(e.target.value) })} placeholder="bv. 30" /></div>
            <div><label className="label">Minstens … bestellingen</label><input type="number" min={0} className="input" value={f.bestellingenMin ?? ''} onChange={e => zetF({ bestellingenMin: getal(e.target.value) })} placeholder="bv. 10 (vaste klanten)" /></div>
            <div><label className="label">Hoogstens … bestellingen</label><input type="number" min={0} className="input" value={f.bestellingenMax ?? ''} onChange={e => zetF({ bestellingenMax: getal(e.target.value) })} placeholder="bv. 1 (nieuwe klanten)" /></div>
            <div><label className="label">Minstens … spaarpunten</label><input type="number" min={0} className="input" value={f.puntenMin ?? ''} onChange={e => zetF({ puntenMin: getal(e.target.value) })} /></div>
            <div><label className="label">Klant sinds minder dan … dagen</label><input type="number" min={0} className="input" value={f.geregistreerdBinnenDagen ?? ''} onChange={e => zetF({ geregistreerdBinnenDagen: getal(e.target.value) })} /></div>
            <div><label className="label">Gemeente(n)</label><input className="input" value={(f.gemeenten || []).join(', ')} onChange={e => zetF({ gemeenten: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} placeholder="Meulebeke, Tielt" /></div>
            <div><label className="label">Postcode(s)</label><input className="input" value={(f.postcodes || []).join(', ')} onChange={e => zetF({ postcodes: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} placeholder="8760, 8700" /></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand" checked={Boolean(f.nooitBesteld)} onChange={e => zetF({ nooitBesteld: e.target.checked })} />Nog nooit besteld</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand" checked={Boolean(f.verjaardagDezeMaand)} onChange={e => zetF({ verjaardagDezeMaand: e.target.checked })} />Verjaart deze maand</label>
          </div>
          <div className="mt-3">
            <label className="label">Bestelde ooit één van deze producten</label>
            <select className="input" value="" onChange={e => e.target.value && zetF({ productIds: Array.from(new Set([...(f.productIds || []), e.target.value])) })}>
              <option value="">+ Product toevoegen…</option>
              {producten.map(p => <option key={p.id} value={p.id}>{p.naam}</option>)}
            </select>
            <div className="mt-2 flex flex-wrap gap-1.5">{(f.productIds || []).map(id => <button type="button" key={id} onClick={() => zetF({ productIds: f.productIds!.filter(x => x !== id) })} className="rounded-md bg-white px-2 py-1 text-xs ring-1 ring-ink/15">{producten.find(p => p.id === id)?.naam || 'product'} ✕</button>)}</div>
          </div>
          <div className="mt-3">
            <label className="label">… of uit deze categorie</label>
            <div className="flex flex-wrap gap-1.5">{cats.map(([id, n]) => { const aan = f.categorieIds?.includes(id); return <button type="button" key={id} onClick={() => zetF({ categorieIds: aan ? f.categorieIds!.filter(x => x !== id) : [...(f.categorieIds || []), id] })} className={`rounded-md px-2.5 py-1 text-sm ${aan ? 'bg-ink text-white' : 'bg-white ring-1 ring-ink/15'}`}>{n}</button> })}</div>
          </div>
        </div>
        <div className="rounded-lg bg-sky-50 p-3 text-sm"><strong>{telling?.aantal ?? '…'} klant{telling?.aantal === 1 ? '' : 'en'}</strong> voldoen nu aan deze voorwaarden{telling?.voorbeeld.length ? `: ${telling.voorbeeld.join(', ')}${(telling.aantal || 0) > telling.voorbeeld.length ? '…' : ''}` : ''}.</div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onSluit}>Annuleren</button><button className="btn-brand">Opslaan</button></div>
      </form>
    </Modal>
  )
}
