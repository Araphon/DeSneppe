'use client'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import Modal, { Bevestig } from '@/components/Modal'
import { Melding, PaginaKop, useMelding } from '@/components/admin/ui'

type Herhaling = 'GEEN' | 'DAGELIJKS' | 'WEKELIJKS' | 'MAANDELIJKS' | 'JAARLIJKS'
type Regel = { id?: string; type: 'OPEN' | 'GESLOTEN'; titel: string | null; startDatum: string; eindDatum: string | null; startTijd: string | null; eindTijd: string | null; herhaling: Herhaling; interval: number; weekdagen: number[]; herhalingTot: string | null }
type Dag = { datum: string; open: [number, number][]; sluitingen: string[] }

const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const DAGEN_LANG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
const HERH: { k: Herhaling; t: string }[] = [
  { k: 'GEEN', t: 'Niet herhalen' }, { k: 'DAGELIJKS', t: 'Dagelijks' }, { k: 'WEKELIJKS', t: 'Wekelijks' }, { k: 'MAANDELIJKS', t: 'Maandelijks' }, { k: 'JAARLIJKS', t: 'Jaarlijks' },
]
const d10 = (s: string | null) => (s ? s.slice(0, 10) : null)
const tijd = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const plus = (d: string, n: number) => { const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10) }
const wd = (d: string) => { const w = new Date(d + 'T12:00:00Z').getUTCDay(); return w === 0 ? 7 : w }
const fmtD = (d: string) => new Intl.DateTimeFormat('nl-BE', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d + 'T12:00:00Z'))
const vandaag = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())

function isVoorkomen(r: Regel, d: string) {
  const diff = Math.round((+new Date(d + 'T12:00:00Z') - +new Date(r.startDatum + 'T12:00:00Z')) / 864e5)
  if (diff < 0 || (r.herhalingTot && d > r.herhalingTot)) return false
  const iv = Math.max(1, r.interval || 1)
  if (r.herhaling === 'GEEN') return diff === 0
  if (r.herhaling === 'DAGELIJKS') return diff % iv === 0
  if (r.herhaling === 'WEKELIJKS') { const dagen = r.weekdagen.length ? r.weekdagen : [wd(r.startDatum)]; if (!dagen.includes(wd(d))) return false; const ma = plus(r.startDatum, 1 - wd(r.startDatum)); return Math.floor(Math.round((+new Date(d + 'T12:00:00Z') - +new Date(ma + 'T12:00:00Z')) / 864e5) / 7) % iv === 0 }
  const [ys, ms, ds] = r.startDatum.split('-').map(Number), [y, m, dd] = d.split('-').map(Number)
  if (r.herhaling === 'MAANDELIJKS') return dd === ds && ((y - ys) * 12 + (m - ms)) % iv === 0
  return m === ms && dd === ds && (y - ys) % iv === 0
}
function geldtOp(r: Regel, d: string) {
  const duur = r.eindDatum ? Math.max(0, Math.round((+new Date(r.eindDatum + 'T12:00:00Z') - +new Date(r.startDatum + 'T12:00:00Z')) / 864e5)) : 0
  for (let k = 0; k <= duur; k++) if (isVoorkomen(r, plus(d, -k))) return true
  return false
}

function omschrijf(r: Regel) {
  const iv = r.interval > 1 ? r.interval : 0
  let h = ''
  switch (r.herhaling) {
    case 'GEEN': h = r.eindDatum && r.eindDatum !== r.startDatum ? `${fmtD(r.startDatum)} t.e.m. ${fmtD(r.eindDatum)}` : fmtD(r.startDatum); break
    case 'DAGELIJKS': h = iv ? `Om de ${iv} dagen` : 'Elke dag'; break
    case 'WEKELIJKS': h = `${iv ? `Om de ${iv} weken` : 'Elke week'} op ${(r.weekdagen.length ? r.weekdagen : [wd(r.startDatum)]).map(d => DAGEN_LANG[d - 1]).join(', ')}`; break
    case 'MAANDELIJKS': h = `${iv ? `Om de ${iv} maanden` : 'Elke maand'} op dag ${Number(r.startDatum.slice(8))}`; break
    case 'JAARLIJKS': h = `Elk jaar op ${new Intl.DateTimeFormat('nl-BE', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(new Date(r.startDatum + 'T12:00:00Z'))}${r.eindDatum && r.eindDatum !== r.startDatum ? ` (${Math.round((+new Date(r.eindDatum) - +new Date(r.startDatum)) / 864e5) + 1} dagen)` : ''}`; break
  }
  if (r.herhaling !== 'GEEN') h += ` · vanaf ${fmtD(r.startDatum)}${r.herhalingTot ? ` tot ${fmtD(r.herhalingTot)}` : ''}`
  const uren = r.startTijd && r.eindTijd ? `${r.startTijd}–${r.eindTijd}` : r.type === 'GESLOTEN' ? 'hele dag' : ''
  return { h, uren }
}

export default function Openingsuren() {
  const [maand, setMaand] = useState(() => vandaag().slice(0, 7) + '-01')
  const [data, setData] = useState<{ regels: Regel[]; kalender: Dag[] } | null>(null)
  const [bewerk, setBewerk] = useState<Regel | null>(null)
  const [weg, setWeg] = useState<Regel | null>(null)
  const [dagMenu, setDagMenu] = useState<Dag | null>(null)
  const melding = useMelding()
  const start = plus(maand, 1 - wd(maand)) // maandag vóór de 1e
  const laad = () => vraag<{ regels: Regel[]; kalender: Dag[] }>(`/api/admin/openingsuren?van=${start}&dagen=42`).then(d => setData({ ...d, regels: d.regels.map(r => ({ ...r, startDatum: d10(r.startDatum)!, eindDatum: d10(r.eindDatum), herhalingTot: d10(r.herhalingTot) })) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { laad() }, [maand])

  const nieuweRegel = (datum: string, type: 'OPEN' | 'GESLOTEN' = 'GESLOTEN'): Regel => ({ type, titel: '', startDatum: datum, eindDatum: null, startTijd: type === 'OPEN' ? '06:00' : null, eindTijd: type === 'OPEN' ? '14:00' : null, herhaling: 'GEEN', interval: 1, weekdagen: [wd(datum)], herhalingTot: null })
  const maandNaam = new Intl.DateTimeFormat('nl-BE', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(maand + 'T12:00:00Z'))
  const mPlus = (n: number) => { const [y, m] = maand.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); setMaand(d.toISOString().slice(0, 10)) }
  const nu = vandaag()

  return (
    <>
      <PaginaKop titel="Openingsuren" sub="Wanneer kunnen klanten bestellingen afhalen? Gesloten-regels gaan altijd voor.">
        <button className="btn-ghost" onClick={() => setBewerk(nieuweRegel(nu, 'OPEN'))}>+ Openingsuren</button>
        <button className="btn-ink" onClick={() => setBewerk(nieuweRegel(nu, 'GESLOTEN'))}>+ Sluiting / verlof</button>
      </PaginaKop>

      <div className="card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <button className="btn-ghost btn-sm" onClick={() => mPlus(-1)} aria-label="Vorige maand">‹</button>
          <button className="btn-ghost btn-sm" onClick={() => setMaand(nu.slice(0, 7) + '-01')}>Vandaag</button>
          <button className="btn-ghost btn-sm" onClick={() => mPlus(1)} aria-label="Volgende maand">›</button>
          <h2 className="ml-2 font-display text-xl font-bold capitalize">{maandNaam}</h2>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-ink/50">{DAGEN.map(d => <div key={d} className="py-1">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {(data?.kalender || Array.from({ length: 42 }, (_, i) => ({ datum: plus(start, i), open: [], sluitingen: [] }))).map(d => {
            const inMaand = d.datum.slice(0, 7) === maand.slice(0, 7)
            const open = d.open.length > 0
            return (
              <button key={d.datum} onClick={() => data && setDagMenu(d)}
                className={`min-h-[72px] rounded-lg border p-1.5 text-left text-xs transition hover:ring-2 hover:ring-brand sm:min-h-[84px] ${!inMaand ? 'opacity-40' : ''} ${open ? 'border-emerald-200 bg-emerald-50' : 'border-ink/10 bg-white'} ${d.datum === nu ? 'ring-2 ring-ink' : ''}`}>
                <span className="block font-semibold">{Number(d.datum.slice(8))}</span>
                {data && (open
                  ? d.open.map(([a, b], i) => <span key={i} className="block text-emerald-800">{tijd(a)}–{tijd(b)}</span>)
                  : <span className="block text-ink/40">{d.sluitingen[0] || 'Gesloten'}</span>)}
                {open && d.sluitingen[0] && <span className="block truncate text-brand-dark">{d.sluitingen[0]}</span>}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-ink/50">Klik op een dag om een extra shift, een sluiting of de regels van die dag te bekijken.</p>
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl font-bold">Regels</h2>
      <div className="card divide-y divide-ink/5">
        {data?.regels.map(r => {
          const o = omschrijf(r)
          return (
            <div key={r.id} className="flex items-center gap-3 p-4">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.type === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{r.type === 'OPEN' ? 'OPEN' : 'GESLOTEN'}</span>
              <div className="flex-1">
                <p className="font-semibold">{r.titel || (r.type === 'OPEN' ? 'Openingsuren' : 'Sluiting')} <span className="font-normal text-ink/60">· {o.uren}</span></p>
                <p className="text-sm text-ink/60">{o.h}</p>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => setBewerk(r)}>Bewerken</button>
              <button className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50" onClick={() => setWeg(r)} aria-label="Verwijderen">🗑</button>
            </div>
          )
        })}
        {data && !data.regels.length && <p className="p-6 text-center text-ink/50">Nog geen regels — de zaak staat overal op gesloten.</p>}
      </div>

      {dagMenu && data && (() => {
        const dag = dagMenu
        const regelsVanDag = data.regels.filter(r => geldtOp(r, dag.datum))
        return (
          <Modal titel={fmtD(dag.datum)} onSluit={() => setDagMenu(null)}>
            <p className="mb-1 text-sm text-ink/60">Afhalen mogelijk:</p>
            <p className="mb-4 font-display text-xl font-bold">{dag.open.length ? dag.open.map(([a, b]) => `${tijd(a)}–${tijd(b)}`).join('  &  ') : 'Gesloten'}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="btn bg-emerald-600 py-3 text-white hover:bg-emerald-700" onClick={() => { const laatste = dag.open[dag.open.length - 1]; const r = nieuweRegel(dag.datum, 'OPEN'); if (laatste) { r.startTijd = tijd(Math.min(laatste[1] + 120, 22 * 60)); r.eindTijd = tijd(Math.min(laatste[1] + 240, 23 * 60)) } r.titel = dag.open.length ? 'Extra shift' : ''; setDagMenu(null); setBewerk(r) }}>+ {dag.open.length ? 'Extra shift' : 'Openingsuren'}</button>
              <button className="btn bg-red-600 py-3 text-white hover:bg-red-700" onClick={() => { setDagMenu(null); setBewerk(nieuweRegel(dag.datum, 'GESLOTEN')) }}>Sluiting / verlof</button>
            </div>
            {regelsVanDag.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold">Regels die deze dag bepalen</p>
                <div className="divide-y divide-ink/5 rounded-lg border border-ink/10">
                  {regelsVanDag.map(r => { const o = omschrijf(r); return (
                    <div key={r.id} className="flex items-center gap-2 p-2.5 text-sm">
                      <span className={`rounded px-1.5 text-xs font-bold ${r.type === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{r.type === 'OPEN' ? 'OPEN' : 'DICHT'}</span>
                      <span className="flex-1">{r.titel || (r.type === 'OPEN' ? 'Openingsuren' : 'Sluiting')} · {o.uren}<span className="block text-xs text-ink/50">{r.herhaling === 'GEEN' ? 'eenmalig' : o.h}</span></span>
                      <button className="btn-ghost btn-sm" onClick={() => { setDagMenu(null); setBewerk(r) }}>Bewerken</button>
                    </div>
                  ) })}
                </div>
                <p className="mt-2 text-xs text-ink/50">Let op: “Bewerken” van een terugkerende regel past alle dagen aan. Wil je enkel deze dag anders, voeg dan een extra shift of sluiting toe.</p>
              </div>
            )}
          </Modal>
        )
      })()}
      {bewerk && <RegelModal r={bewerk} onSluit={() => setBewerk(null)} onOpgeslagen={() => { setBewerk(null); laad(); melding.ok('Opgeslagen') }} onFout={melding.fout} />}
      {weg && <Bevestig titel="Regel verwijderen?" gevaarlijk knop="Verwijderen" tekst={<>“{weg.titel || (weg.type === 'OPEN' ? 'Openingsuren' : 'Sluiting')}” wordt verwijderd.</>}
        onNee={() => setWeg(null)} onJa={async () => { await vraag(`/api/admin/openingsuren/${weg.id}`, 'DELETE'); setWeg(null); laad(); melding.ok('Verwijderd') }} />}
      <Melding m={melding.m} />
    </>
  )
}

function RegelModal({ r: start, onSluit, onOpgeslagen, onFout }: { r: Regel; onSluit: () => void; onOpgeslagen: () => void; onFout: (t: string) => void }) {
  const [r, setR] = useState<Regel>(start)
  const [heleDag, setHeleDag] = useState(start.type === 'GESLOTEN' && !start.startTijd)
  const [meerdaags, setMeerdaags] = useState(Boolean(start.eindDatum && start.eindDatum !== start.startDatum))
  const zet = (p: Partial<Regel>) => setR({ ...r, ...p })
  const eenheid = { DAGELIJKS: 'dag(en)', WEKELIJKS: 'week/weken', MAANDELIJKS: 'maand(en)', JAARLIJKS: 'jaar', GEEN: '' }[r.herhaling]
  return (
    <Modal titel={start.id ? 'Regel bewerken' : r.type === 'OPEN' ? 'Openingsuren toevoegen' : 'Sluiting toevoegen'} onSluit={onSluit}>
      <form className="space-y-4" onSubmit={async e => {
        e.preventDefault()
        const data = {
          ...r,
          startTijd: r.type === 'GESLOTEN' && heleDag ? null : r.startTijd,
          eindTijd: r.type === 'GESLOTEN' && heleDag ? null : r.eindTijd,
          eindDatum: meerdaags ? r.eindDatum : null,
        }
        try {
          if (start.id) await vraag(`/api/admin/openingsuren/${start.id}`, 'PUT', data)
          else await vraag('/api/admin/openingsuren', 'POST', data)
          onOpgeslagen()
        } catch (err) { onFout((err as Error).message) }
      }}>
        <div className="grid grid-cols-2 rounded-full bg-sand p-1 text-sm font-semibold">
          <button type="button" onClick={() => zet({ type: 'OPEN', startTijd: r.startTijd || '06:00', eindTijd: r.eindTijd || '14:00' })} className={`rounded-full py-2 ${r.type === 'OPEN' ? 'bg-emerald-600 text-white' : ''}`}>Open</button>
          <button type="button" onClick={() => zet({ type: 'GESLOTEN' })} className={`rounded-full py-2 ${r.type === 'GESLOTEN' ? 'bg-red-600 text-white' : ''}`}>Gesloten</button>
        </div>
        <div><label className="label" htmlFor="rt">Omschrijving (optioneel)</label><input id="rt" className="input" value={r.titel || ''} onChange={e => zet({ titel: e.target.value })} placeholder={r.type === 'OPEN' ? 'Bv. Weekschema' : 'Bv. Zomerverlof, Paasmaandag'} /></div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="sd">{meerdaags ? 'Van' : 'Datum'}</label><input id="sd" type="date" className="input" required value={r.startDatum} onChange={e => zet({ startDatum: e.target.value, weekdagen: r.herhaling === 'WEKELIJKS' ? r.weekdagen : [wd(e.target.value)] })} /></div>
          {meerdaags && <div><label className="label" htmlFor="ed">Tot en met</label><input id="ed" type="date" className="input" required min={r.startDatum} value={r.eindDatum || ''} onChange={e => zet({ eindDatum: e.target.value })} /></div>}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand" checked={meerdaags} onChange={e => { setMeerdaags(e.target.checked); if (e.target.checked && !r.eindDatum) zet({ eindDatum: plus(r.startDatum, 6) }) }} />Meerdere dagen (bv. vakantie)</label>

        {r.type === 'GESLOTEN' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand" checked={heleDag} onChange={e => { setHeleDag(e.target.checked); if (!e.target.checked) zet({ startTijd: '12:00', eindTijd: '14:00' }) }} />Hele dag gesloten</label>}
        {(r.type === 'OPEN' || !heleDag) && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="st">{r.type === 'OPEN' ? 'Open van' : 'Gesloten van'}</label><input id="st" type="time" className="input" required value={r.startTijd || ''} onChange={e => zet({ startTijd: e.target.value })} /></div>
            <div><label className="label" htmlFor="et">tot</label><input id="et" type="time" className="input" required value={r.eindTijd || ''} onChange={e => zet({ eindTijd: e.target.value })} /></div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="hh">Terugkerend</label>
          <select id="hh" className="input" value={r.herhaling} onChange={e => zet({ herhaling: e.target.value as Herhaling })}>
            {HERH.map(h => <option key={h.k} value={h.k}>{h.t}</option>)}
          </select>
        </div>
        {r.herhaling !== 'GEEN' && (
          <div className="space-y-3 rounded-2xl bg-cream p-4">
            <div className="flex items-center gap-2 text-sm">Om de <input type="number" min={1} max={52} className="input w-20" value={r.interval} onChange={e => zet({ interval: Math.max(1, Number(e.target.value)) })} /> {eenheid}</div>
            {r.herhaling === 'WEKELIJKS' && (
              <div className="flex flex-wrap gap-1.5">
                {DAGEN.map((d, i) => {
                  const aan = r.weekdagen.includes(i + 1)
                  return <button type="button" key={d} onClick={() => zet({ weekdagen: aan ? r.weekdagen.filter(x => x !== i + 1) : [...r.weekdagen, i + 1].sort() })} className={`h-10 w-10 rounded-full text-sm font-semibold ${aan ? 'bg-ink text-white' : 'bg-white border border-ink/15'}`}>{d}</button>
                })}
              </div>
            )}
            <div><label className="label" htmlFor="ht">Herhalen tot (optioneel)</label><input id="ht" type="date" className="input" min={r.startDatum} value={r.herhalingTot || ''} onChange={e => zet({ herhalingTot: e.target.value || null })} /></div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={onSluit}>Annuleren</button><button className="btn-brand">Opslaan</button></div>
      </form>
    </Modal>
  )
}
