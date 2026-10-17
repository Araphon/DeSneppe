'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { vraag } from '../fetcher'
import Modal, { Bevestig } from '../Modal'
import { printBestelling, type Ontwerpen, type PrinterConfig } from '../print'
import { euro, euroDelta } from '@/lib/geld'

type Regel = { id: string; productNaam: string; aantal: number; totaalCent: number; leeftijdsgrens?: number | null; keuzes: { optie: string; keuze: string; prijsCent: number }[]; aanpassingen: { naam: string; prijsCent: number }[]; stickerPrinten: boolean }
export type Best = { id: string; nummer: number; slotMinuten: number; status: 'ONTVANGEN' | 'BEZIG' | 'KLAAR' | 'AFGEHAALD' | 'NIET_AFGEHAALD' | 'GEANNULEERD'; klantNaam: string; klantTelefoon: string | null; afhaalTijd: string; aangemaaktOp: string; totaalCent: number; opmerking: string | null; geprintOp: string | null; regels: Regel[]; betaalwijze: string; betaalStatus: string; transactiekostCent: number; kostLabel: string | null }

const KOLOMMEN: { s: Best['status']; t: string; kleur: string }[] = [
  { s: 'ONTVANGEN', t: 'Nieuw', kleur: 'bg-sky-500' },
  { s: 'BEZIG', t: 'Bezig', kleur: 'bg-mustard' },
  { s: 'KLAAR', t: 'Klaar', kleur: 'bg-emerald-500' },
]
const slotEind = (iso: string, min = 15) => new Intl.DateTimeFormat('nl-BE', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit' }).format(new Date(new Date(iso).getTime() + min * 60000))
const tijd = (iso: string) => new Intl.DateTimeFormat('nl-BE', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const vandaag = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())

function piep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    ;[0, 0.18, 0.36].forEach((t, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.frequency.value = i === 2 ? 1320 : 880; o.type = 'sine'
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16)
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.17)
    })
  } catch {}
}

function Tegel({ b, onClick, groot }: { b: Best; onClick: () => void; groot: boolean }) {
  const laat = b.status !== 'KLAAR' && new Date(b.afhaalTijd).getTime() < Date.now()
  const binnenkort = !laat && b.status !== 'KLAAR' && new Date(b.afhaalTijd).getTime() - Date.now() < 15 * 60000
  return (
    <button onClick={onClick} className={`w-full rounded-2xl bg-white p-4 text-left shadow-card transition hover:shadow-lg ${b.status === 'ONTVANGEN' ? 'ring-2 ring-sky-500' : ''} ${laat ? 'ring-2 ring-red-500' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-display font-bold leading-tight ${groot ? 'text-2xl' : 'text-xl'}`}>{b.klantNaam}</p>
          <p className="text-sm text-ink/50">#{b.nummer} · besteld {tijd(b.aangemaaktOp)}</p>
        </div>
        <div className={`shrink-0 rounded-xl px-3 py-1.5 text-center ${laat ? 'bg-red-600 text-white' : binnenkort ? 'bg-mustard text-ink' : 'bg-ink text-white'}`}>
          <p className="text-[10px] uppercase tracking-wide opacity-80">afhalen</p>
          <p className={`font-display font-bold leading-none ${groot ? 'text-2xl' : 'text-xl'}`}>{tijd(b.afhaalTijd)}</p>
          <p className="text-[10px] opacity-80">tot {slotEind(b.afhaalTijd, b.slotMinuten)}</p>
        </div>
      </div>
      <ul className={`mt-3 space-y-1.5 ${groot ? 'text-base' : 'text-sm'}`}>
        {b.regels.map(r => (
          <li key={r.id}>
            <span className="font-semibold">{r.aantal}× {r.productNaam}</span>
            {r.keuzes.length > 0 && <span className="block pl-5 text-ink/70">{r.keuzes.map(k => k.keuze).join(', ')}</span>}
            {r.aanpassingen.map((a, i) => <span key={i} className="block pl-5 font-medium text-brand-dark">• {a.naam}</span>)}
          </li>
        ))}
      </ul>
      {b.opmerking && <p className="mt-3 rounded-lg bg-mustard/20 p-2 text-sm"><strong>Opmerking:</strong> {b.opmerking}</p>}
      {b.regels.some(r => r.leeftijdsgrens) && <p className="mt-3 rounded-lg bg-ink px-2 py-1 text-sm font-bold text-white">🔞 {Math.max(...b.regels.map(r => r.leeftijdsgrens || 0))}+ – leeftijd controleren</p>}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-semibold">{euro(b.totaalCent)} {b.betaalStatus === 'BETAALD' ? <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800">BETAALD</span> : b.betaalStatus === 'TERUGBETAALD' ? <span className="ml-1 rounded bg-ink/10 px-1.5 py-0.5 text-xs">terugbetaald</span> : <span className="ml-1 text-xs font-normal text-ink/50">te betalen</span>}</span>
        <span className="text-ink/40">{b.geprintOp ? '🖨 geprint' : ''}</span>
      </div>
    </button>
  )
}

export default function BestelBord({ kassa = false, printers, ontwerp }: { kassa?: boolean; printers?: PrinterConfig & { autoPrint: boolean }; ontwerp?: Ontwerpen }) {
  const [datum, setDatum] = useState(vandaag())
  const [lijst, setLijst] = useState<Best[] | null>(null)
  const [open, setOpen] = useState<Best | null>(null)
  const [annuleer, setAnnuleer] = useState<Best | null>(null)
  const [terug, setTerug] = useState(true)
  const [noShow, setNoShow] = useState<Best | null>(null)
  const [toonAfgerond, setToonAfgerond] = useState(false)
  const [melding, setMelding] = useState<{ ok: boolean; t: string } | null>(null)
  const [geluidAan, setGeluidAan] = useState(false)
  const gekend = useRef<Set<string> | null>(null)
  const printQueue = useRef<Set<string>>(new Set())

  const toon = (ok: boolean, t: string) => { setMelding({ ok, t }); setTimeout(() => setMelding(null), 4000) }

  const print = useCallback(async (b: Best, wat?: { ticket?: boolean; stickers?: boolean }) => {
    if (!printers || !ontwerp) return
    try {
      await printBestelling(b, printers, ontwerp, wat)
      await vraag(`/api/admin/bestellingen/${b.id}`, 'PUT', { geprint: true })
      toon(true, `Bestelling #${b.nummer} geprint`)
    } catch (e) { toon(false, (e as Error).message) }
  }, [printers, ontwerp])

  const laad = useCallback(async () => {
    try {
      const d = await vraag<Best[]>(`/api/admin/bestellingen?datum=${datum}`)
      setLijst(d)
      if (datum === vandaag()) {
        const ids = new Set(d.map(b => b.id))
        if (gekend.current) {
          const nieuw = d.filter(b => !gekend.current!.has(b.id) && b.status === 'ONTVANGEN')
          if (nieuw.length && kassa) piep()
        }
        gekend.current = ids
        // Automatisch printen (kassa): elke nieuwe, nog niet geprinte bestelling één keer
        if (kassa && printers?.autoPrint) {
          for (const b of d) {
            if (b.status === 'ONTVANGEN' && !b.geprintOp && !printQueue.current.has(b.id)) {
              printQueue.current.add(b.id)
              await print(b)
            }
          }
        }
      }
    } catch (e) { toon(false, (e as Error).message) }
  }, [datum, kassa, printers, print])

  useEffect(() => { gekend.current = null; laad(); const t = setInterval(laad, kassa ? 5000 : 10000); return () => clearInterval(t) }, [laad, kassa])

  async function zetStatus(b: Best, status: Best['status'], terugbetalen = false) {
    try {
      await vraag(`/api/admin/bestellingen/${b.id}`, 'PUT', { status, terugbetalen })
      setOpen(null); setAnnuleer(null); laad()
    } catch (e) { toon(false, (e as Error).message) }
  }

  const per = (s: Best['status']) => (lijst || []).filter(b => b.status === s)
  const afgerond = (lijst || []).filter(b => b.status === 'AFGEHAALD' || b.status === 'GEANNULEERD' || b.status === 'NIET_AFGEHAALD')
  const omzet = (lijst || []).filter(b => b.status !== 'GEANNULEERD').reduce((s, b) => s + b.totaalCent, 0)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input type="date" className="input w-auto" value={datum} onChange={e => setDatum(e.target.value)} />
        {datum !== vandaag() && <button className="btn-ghost btn-sm" onClick={() => setDatum(vandaag())}>Vandaag</button>}
        <span className="text-sm text-ink/60">{(lijst || []).filter(b => b.status !== 'GEANNULEERD').length} bestellingen · {euro(omzet)}</span>
        {kassa && !geluidAan && <button className="btn-brand btn-sm ml-auto" onClick={() => { piep(); setGeluidAan(true) }}>🔔 Geluid activeren</button>}
      </div>
      {!lijst ? <p className="text-ink/50">Laden…</p> : (
        <div className="grid gap-5 md:grid-cols-3">
          {KOLOMMEN.map(k => (
            <div key={k.s} className="min-w-0">
              <div className="mb-3 flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${k.kleur}`} /><h2 className="font-display text-lg font-bold">{k.t}</h2><span className="rounded-full bg-ink/10 px-2 text-sm font-semibold">{per(k.s).length}</span></div>
              <div className="space-y-3">
                {per(k.s).map(b => <Tegel key={b.id} b={b} groot={kassa} onClick={() => setOpen(b)} />)}
                {!per(k.s).length && <p className="rounded-2xl border-2 border-dashed border-ink/10 p-6 text-center text-sm text-ink/40">Geen bestellingen</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {afgerond.length > 0 && (
        <div className="mt-8">
          <button className="text-sm font-semibold text-ink/60" onClick={() => setToonAfgerond(v => !v)}>{toonAfgerond ? '▾' : '▸'} Afgehaald, niet afgehaald & geannuleerd ({afgerond.length})</button>
          {toonAfgerond && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {afgerond.map(b => <div key={b.id} className="opacity-60"><Tegel b={b} groot={false} onClick={() => setOpen(b)} /></div>)}
            </div>
          )}
        </div>
      )}

      {open && (
        <Modal titel={`#${open.nummer} · ${open.klantNaam}`} onSluit={() => setOpen(null)} breed>
          <p className="text-ink/60">Afhalen tussen <strong className="text-ink">{tijd(open.afhaalTijd)} en {slotEind(open.afhaalTijd, open.slotMinuten)}</strong>{open.klantTelefoon && <> · <a className="underline" href={`tel:${open.klantTelefoon}`}>{open.klantTelefoon}</a></>}</p>
          <ul className="mt-4 divide-y divide-ink/10">
            {open.regels.map(r => (
              <li key={r.id} className="flex justify-between gap-4 py-2">
                <div>
                  <p className="font-semibold">{r.aantal}× {r.productNaam} {r.stickerPrinten && <span title="Sticker">🏷️</span>}</p>
                  {r.keuzes.map((k, i) => <p key={i} className="text-sm text-ink/70">{k.optie}: {k.keuze} {euroDelta(k.prijsCent)}</p>)}
                  {r.aanpassingen.map((a, i) => <p key={i} className="text-sm font-medium text-brand-dark">• {a.naam} {euroDelta(a.prijsCent)}</p>)}
                </div>
                <p>{euro(r.totaalCent)}</p>
              </li>
            ))}
          </ul>
          {open.opmerking && <p className="mt-3 rounded-lg bg-mustard/20 p-3 text-sm"><strong>Opmerking:</strong> {open.opmerking}</p>}
          {open.transactiekostCent > 0 && <p className="mt-3 text-right text-sm text-ink/60">{open.kostLabel || 'Servicekost'} {euro(open.transactiekostCent)}</p>}
          <p className="text-right text-lg font-bold">Totaal {euro(open.totaalCent)}</p>
          <p className={`text-right text-sm font-semibold ${open.betaalStatus === 'BETAALD' ? 'text-emerald-700' : 'text-ink/60'}`}>{open.betaalStatus === 'BETAALD' ? '✓ Online betaald — niets meer aanrekenen' : open.betaalStatus === 'TERUGBETAALD' ? 'Terugbetaald' : 'Te betalen aan de kassa'}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button className={`btn py-4 text-base ${open.status === 'BEZIG' ? 'bg-mustard' : 'bg-mustard/30 hover:bg-mustard'}`} onClick={() => zetStatus(open, 'BEZIG')}>👩‍🍳 Bezig</button>
            <button className={`btn py-4 text-base text-white ${open.status === 'KLAAR' ? 'bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600'}`} onClick={() => zetStatus(open, 'KLAAR')}>✅ Klaar</button>
            <button className="btn-ghost py-4 text-base" onClick={() => zetStatus(open, 'AFGEHAALD')}>👋 Afgehaald</button>
            <button className="btn py-4 text-base text-red-600 ring-1 ring-red-200 hover:bg-red-50" onClick={() => { setTerug(true); setAnnuleer(open) }}>Annuleren</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {open.status !== 'ONTVANGEN' ? <button className="text-sm text-ink/50 underline" onClick={() => zetStatus(open, 'ONTVANGEN')}>Terugzetten naar “Nieuw”</button> : <span />}
            {open.status !== 'NIET_AFGEHAALD' && open.status !== 'GEANNULEERD' && open.status !== 'AFGEHAALD' && <button className="text-sm font-semibold text-red-600 underline" onClick={() => setNoShow(open)}>🚫 Niet afgehaald</button>}
            {open.status === 'NIET_AFGEHAALD' && <span className="text-sm font-semibold text-red-600">🚫 Gemarkeerd als niet afgehaald</span>}
          </div>
          {printers && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
              <button className="btn-ghost btn-sm" onClick={() => print(open, { ticket: true })}>🖨 Ticket opnieuw</button>
              {open.regels.some(r => r.stickerPrinten) && <button className="btn-ghost btn-sm" onClick={() => print(open, { stickers: true })}>🏷️ Stickers opnieuw</button>}
            </div>
          )}
          <p className="mt-3 text-xs text-ink/50">Bij “Bezig” en “Klaar” krijgt de klant automatisch een e-mail.</p>
        </Modal>
      )}
      {annuleer && <Bevestig titel="Bestelling annuleren?" gevaarlijk knop="Annuleren" tekst={<>
        <p>Bestelling #{annuleer.nummer} van {annuleer.klantNaam} wordt geannuleerd. De klant krijgt hiervan een e-mail.</p>
        {annuleer.betaalStatus === 'BETAALD' && <label className="mt-4 flex items-start gap-2 rounded-lg bg-sand p-3 text-ink"><input type="checkbox" className="mt-1 h-4 w-4 accent-ink" checked={terug} onChange={e => setTerug(e.target.checked)} /><span><strong>{euro(annuleer.totaalCent)} terugbetalen</strong> via Mollie<span className="block text-xs text-ink/60">De klant betaalde online. Het geld komt binnen enkele werkdagen terug op zijn rekening.</span></span></label>}
      </>} onNee={() => setAnnuleer(null)} onJa={() => zetStatus(annuleer, 'GEANNULEERD', annuleer.betaalStatus === 'BETAALD' && terug)} />}
      {noShow && <Bevestig titel="Niet afgehaald?" gevaarlijk knop="Ja, niet afgehaald" tekst={<>Bestelling #{noShow.nummer} van {noShow.klantNaam} werd niet afgehaald.{noShow.betaalwijze === 'AAN_KASSA' ? ' De klant krijgt een no-show genoteerd; na herhaling kan hij enkel nog online betalen.' : ' De bestelling was al online betaald.'}</>} onNee={() => setNoShow(null)} onJa={async () => { await zetStatus(noShow, 'NIET_AFGEHAALD'); setNoShow(null) }} />}
      {melding && <div className={`fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-xl ${melding.ok ? 'bg-ink' : 'bg-red-600'}`}>{melding.t}</div>}
    </div>
  )
}
