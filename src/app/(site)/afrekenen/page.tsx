'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AuthFormulier from '@/components/AuthFormulier'
import { MandRegels } from '@/components/Mandje'
import { useWinkelmand } from '@/components/winkelmand'
import { vraag } from '@/components/fetcher'
import { euro } from '@/lib/geld'
import type { DagSlots } from '@/lib/tijdslots'
import type { MenuCategorie } from '@/lib/catalogus'
import { nietBeschikbaarReden, type BeschikbaarRegels } from '@/lib/beschikbaarheid'
import { betaalInApp, isNative } from '@/components/app/native'

type Klant = { voornaam: string; naam: string; email: string; telefoon: string; punten: number; onvolledig?: boolean }
type BetaalOpties = { online: boolean; aanKassa: boolean; transactiekostCent: number; transactiekostOnderCent: number; transactiekostLabel: string; onlineVanafCent: number; aanKassaReden?: string | null; maxEersteBestellingCent?: number; nieuweKlant?: boolean; geblokkeerd?: boolean }

function dagLabel(datum: string, i: number) {
  if (i === 0) return 'Vandaag'
  if (i === 1) return 'Morgen'
  return new Intl.DateTimeFormat('nl-BE', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(datum + 'T12:00:00Z'))
}

export default function Afrekenen() {
  const router = useRouter()
  const { mand, totaalCent, geladen, leeg } = useWinkelmand()
  const [klant, setKlant] = useState<Klant | null | undefined>(undefined)
  const [dagen, setDagen] = useState<DagSlots[] | null>(null)
  const [dag, setDag] = useState<string>('')
  const [slot, setSlot] = useState<string>('')
  const [opmerking, setOpmerking] = useState('')
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)
  const [opties, setOpties] = useState<BetaalOpties | null>(null)
  const [regels, setRegels] = useState<Record<string, { naam: string; r: BeschikbaarRegels; leeftijd: number | null }>>({})
  const [betaalwijze, setBetaalwijze] = useState<'ONLINE' | 'AAN_KASSA'>('AAN_KASSA')

  const laadKlant = () => vraag<{ klant: Klant | null }>('/api/klant/profiel').then(r => setKlant(r.klant)).catch(() => setKlant(null))
  const laadSlots = () => vraag<DagSlots[]>('/api/tijdslots').then(d => {
    setDagen(d)
    setDag(cur => cur && d.some(x => x.datum === cur && x.slots.some(s => s.vrij)) ? cur : (d.find(x => x.slots.some(s => s.vrij))?.datum || ''))
  }).catch(() => setDagen([]))

  useEffect(() => {
    laadKlant(); laadSlots()
    vraag<MenuCategorie[]>('/api/menu').then(m => setRegels(Object.fromEntries(m.flatMap(c => c.producten).map(p => [p.id, { naam: p.naam, r: p.beschikbaar, leeftijd: p.leeftijdsgrens }])))).catch(() => {})
    vraag<BetaalOpties>('/api/betalen').then(o => { setOpties(o); setBetaalwijze(o.online ? 'ONLINE' : 'AAN_KASSA') }).catch(() => setOpties({ online: false, aanKassa: true, transactiekostCent: 0, transactiekostOnderCent: 0, transactiekostLabel: '', onlineVanafCent: 0 }))
  }, [])

  // Servicekost geldt voor elke online bestelling, ongeacht de betaalwijze
  const kostCent = opties && opties.transactiekostCent > 0 && (opties.transactiekostOnderCent === 0 || totaalCent < opties.transactiekostOnderCent) ? opties.transactiekostCent : 0
  const onlineKan = Boolean(opties?.online && (!opties.onlineVanafCent || totaalCent >= opties.onlineVanafCent))
  const kassaTeGroot = Boolean(opties?.nieuweKlant && opties.maxEersteBestellingCent && totaalCent > opties.maxEersteBestellingCent)
  const kassaKan = Boolean(opties?.aanKassa && !kassaTeGroot)
  const kassaReden = opties?.aanKassaReden || (kassaTeGroot ? `Bij je eerste bestelling kan je tot ${euro(opties!.maxEersteBestellingCent!)} aan de kassa betalen.` : '')
  const nietsKan = Boolean(opties && !onlineKan && !kassaKan)
  useEffect(() => {
    if (!opties) return
    if (betaalwijze === 'ONLINE' && !onlineKan && kassaKan) setBetaalwijze('AAN_KASSA')
    if (betaalwijze === 'AAN_KASSA' && !kassaKan && onlineKan) setBetaalwijze('ONLINE')
  }, [onlineKan, kassaKan, opties, betaalwijze])

  // Welke producten in de mand zijn niet beschikbaar op een moment?
  const blokkeert = (datum: string, tijd: string) => mand.map(m => regels[m.productId]).filter(Boolean).map(x => { const reden = nietBeschikbaarReden(x!.r, datum, tijd); return reden ? `${x!.naam} is ${reden}` : null }).filter(Boolean) as string[]
  const kan = (datum: string, s: { tijd: string; vrij: boolean }) => s.vrij && blokkeert(datum, s.tijd).length === 0
  const beperkingen = Array.from(new Set(mand.map(m => regels[m.productId]).filter(x => x && (x.r.dagen.length || x.r.van || x.r.tot)).map(x => x!.naam)))
  const huidigeDag = dagen?.find(d => d.datum === dag)

  // Standaarddag: de eerste dag waarop alles in de mand kan
  useEffect(() => {
    if (!dagen) return
    const cur = dagen.find(d => d.datum === dag)
    if (cur && cur.slots.some(s => kan(cur.datum, s))) return
    const eerste = dagen.find(d => d.slots.some(s => kan(d.datum, s)))
    if (eerste && eerste.datum !== dag) { setDag(eerste.datum); setSlot('') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regels, dagen, mand])

  useEffect(() => {
    if (!slot || !huidigeDag) return
    const s = huidigeDag.slots.find(x => x.iso === slot)
    if (s && !kan(huidigeDag.datum, s)) setSlot('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regels, mand, slot])

  async function plaats() {
    setFout(''); setBezig(true)
    try {
      const r = await vraag<{ id: string; betaalUrl?: string }>('/api/bestellingen', 'POST', {
        afhaalTijd: slot, opmerking, betaalwijze,
        regels: mand.map(m => ({ productId: m.productId, aantal: m.aantal, keuzes: m.keuzes.map(k => k.keuzeId), aanpassingen: m.aanpassingen.map(a => a.id) })),
      })
      leeg()
      if (r.betaalUrl && isNative()) { await betaalInApp(r.id, r.betaalUrl); router.push(`/bestelling/${r.id}?betaling=1`); return }
      if (r.betaalUrl) { window.location.href = r.betaalUrl; return }
      router.push(`/bestelling/${r.id}?nieuw=1`)
    } catch (e) {
      setFout((e as Error).message)
      laadSlots(); setSlot('')
      setBezig(false)
    }
  }

  if (geladen && mand.length === 0 && !bezig) {
    return (
      <div className="container-x max-w-xl py-20 text-center">
        <h1 className="h-display text-3xl">Je mandje is leeg</h1>
        <Link href="/bestellen" className="btn-brand mt-6">Naar de shop</Link>
      </div>
    )
  }

  return (
    <div className="container-x grid gap-8 py-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <h1 className="h-display text-3xl sm:text-4xl">Afrekenen</h1>

        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 font-display text-xl font-bold">1. Jouw gegevens</h2>
          {klant === undefined && <p className="text-ink/50">Laden…</p>}
          {klant === null && <AuthFormulier onKlaar={laadKlant} startModus="registreer" />}
          {klant?.onvolledig && <p className="rounded-lg bg-mustard/20 p-3 text-sm">Je gegevens zijn nog niet volledig. <a className="font-semibold underline" href="/account/aanvullen?terug=/afrekenen">Vul ze aan</a> om te kunnen bestellen.</p>}
          {klant && !klant.onvolledig && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{klant.voornaam} {klant.naam}</p>
                <p className="text-sm text-ink/60">{klant.email} · {klant.telefoon}</p>
              </div>
              <button className="text-sm underline text-ink/60" onClick={async () => { await vraag('/api/klant/logout', 'POST'); setKlant(null) }}>Niet jij?</button>
            </div>
          )}
        </section>

        <section className={`card p-5 sm:p-6 ${!klant ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="mb-4 font-display text-xl font-bold">2. Afhaalmoment</h2>
          {!dagen && <p className="text-ink/50">Beschikbare tijdstippen laden…</p>}
          {dagen && !dagen.some(d => d.slots.some(s => s.vrij)) && <p className="rounded-xl bg-brand-light p-4">Er zijn momenteel geen afhaalmomenten beschikbaar. Bel ons gerust.</p>}
          {beperkingen.length > 0 && <p className="mb-3 rounded-lg bg-sand p-3 text-sm">🕒 Niet alles in je mandje is op elk moment verkrijgbaar ({beperkingen.join(', ')}). Je ziet enkel de afhaalmomenten waarop alles kan.</p>}
          {dagen && dagen.some(d => d.slots.length) && (
            <>
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {dagen.map((d, i) => {
                  const kanDag = d.slots.some(s => kan(d.datum, s))
                  return (
                    <button key={d.datum} disabled={!kanDag} onClick={() => { setDag(d.datum); setSlot('') }}
                      className={`shrink-0 rounded-xl border px-4 py-2 text-left text-sm transition ${dag === d.datum ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white hover:border-ink/40'} disabled:opacity-40`}>
                      <span className="block font-semibold capitalize">{dagLabel(d.datum, i)}</span>
                      <span className="block text-xs opacity-70">{!d.open ? (d.sluiting || 'Gesloten') : kanDag ? `${d.slots.filter(s => kan(d.datum, s)).length} momenten` : d.slots.some(s => s.vrij) ? 'Niet voor je mandje' : 'Volzet'}</span>
                    </button>
                  )
                })}
              </div>
              {huidigeDag && (
                <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {huidigeDag.slots.map(s => (
                    <button key={s.iso} disabled={!kan(huidigeDag.datum, s)} title={blokkeert(huidigeDag.datum, s.tijd).join(' · ') || (s.geblokkeerd ? 'Niet beschikbaar' : !s.vrij ? 'Volzet' : '')} onClick={() => setSlot(s.iso)}
                      className={`rounded-lg border py-2 text-sm font-semibold transition ${slot === s.iso ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white hover:border-brand'} disabled:border-transparent disabled:bg-sand disabled:text-ink/30 disabled:line-through`}>
                      {s.tijd}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {opties && (opties.online || !kassaKan) && (
          <section className={`card p-5 sm:p-6 ${!klant ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="mb-3 font-display text-xl font-bold">3. Betalen</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {opties.online && (
                <label className={`flex items-start gap-3 rounded-lg border p-4 ${!onlineKan ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${betaalwijze === 'ONLINE' ? 'border-ink bg-sand/50' : 'border-ink/15'}`}>
                  <input type="radio" name="bw" className="mt-1 h-4 w-4 accent-ink" disabled={!onlineKan} checked={betaalwijze === 'ONLINE'} onChange={() => setBetaalwijze('ONLINE')} />
                  <span><span className="block font-semibold">Nu online betalen</span><span className="text-sm text-ink/60">Bancontact, kaart, Apple Pay… Aan de kassa moet je niets meer doen.</span>
                    {!onlineKan && opties.onlineVanafCent > 0 && <span className="mt-1 block text-xs font-semibold text-ink/70">Online betalen kan vanaf {euro(opties.onlineVanafCent)}</span>}
                  </span>
                </label>
              )}
              {(opties.aanKassa || kassaReden) && (
                <label className={`flex items-start gap-3 rounded-lg border p-4 ${!kassaKan ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${betaalwijze === 'AAN_KASSA' ? 'border-ink bg-sand/50' : 'border-ink/15'}`}>
                  <input type="radio" name="bw" className="mt-1 h-4 w-4 accent-ink" disabled={!kassaKan} checked={betaalwijze === 'AAN_KASSA'} onChange={() => setBetaalwijze('AAN_KASSA')} />
                  <span><span className="block font-semibold">Betalen bij afhalen</span><span className="text-sm text-ink/60">Je betaalt aan de kassa wanneer je je bestelling ophaalt.</span>
                    {kassaReden && <span className="mt-1 block text-xs font-semibold text-ink/70">{kassaReden}</span>}
                  </span>
                </label>
              )}
            </div>
            {nietsKan && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{opties.geblokkeerd ? 'Je account kan momenteel niet bestellen.' : 'Deze bestelling kan je online niet plaatsen.'} Bel ons gerust op het nummer onderaan de pagina.</p>}
          </section>
        )}

        <section className={`card p-5 sm:p-6 ${!klant ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="mb-3 font-display text-xl font-bold">{opties && (opties.online || !opties.aanKassa) ? 4 : 3}. Opmerking <span className="text-sm font-normal text-ink/50">(optioneel)</span></h2>
          <textarea className="input min-h-[80px]" maxLength={500} value={opmerking} onChange={e => setOpmerking(e.target.value)} placeholder="Bv. extra servetten, saus apart…" />
        </section>
      </div>

      <aside>
        <div className="card sticky top-20 p-5">
          <h2 className="font-display text-xl font-bold">Overzicht</h2>
          <MandRegels compact />
          {kostCent > 0 && <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 text-sm"><span>{opties?.transactiekostLabel}{opties && opties.transactiekostOnderCent > 0 && <span className="block text-xs text-ink/50">bij online bestellingen onder {euro(opties.transactiekostOnderCent)}</span>}</span><span>{euro(kostCent)}</span></div>}
          <div className={`flex justify-between text-lg font-bold ${kostCent > 0 ? 'mt-1' : 'mt-3 border-t border-ink/10 pt-3'}`}><span>Totaal</span><span>{euro(totaalCent + kostCent)}</span></div>
          {(() => { const lg = Math.max(0, ...mand.map(m => regels[m.productId]?.leeftijd || 0)); return lg > 0 && <p className="mt-3 rounded-lg bg-ink px-3 py-2.5 text-sm font-semibold text-white">🔞 Geen verkoop van alcohol onder de {lg} jaar. Bij het afhalen kunnen we een identiteitsbewijs vragen.</p> })()}
          <p className="mt-1 text-sm text-ink/60">{betaalwijze === 'ONLINE' ? 'Je wordt doorgestuurd naar de beveiligde betaalpagina.' : 'Betalen doe je bij het afhalen aan de kassa.'}</p>
          {fout && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{fout}</p>}
          <button className="btn-brand mt-4 w-full py-3.5 text-base" disabled={!klant || klant.onvolledig || !slot || bezig || nietsKan} onClick={plaats}>
            {bezig ? (betaalwijze === 'ONLINE' ? 'Naar betalen…' : 'Bestelling plaatsen…') : !klant ? 'Meld je eerst aan' : !slot ? 'Kies een afhaalmoment' : betaalwijze === 'ONLINE' ? `Betalen · ${euro(totaalCent + kostCent)}` : 'Bestelling plaatsen'}
          </button>
          <p className="mt-3 text-center text-xs text-ink/50">Door te bestellen aanvaard je onze <Link href="/algemene-voorwaarden" target="_blank" className="underline">algemene voorwaarden</Link>.</p>
          <Link href="/bestellen" className="mt-2 block text-center text-sm text-ink/60 underline">Nog iets toevoegen</Link>
        </div>
      </aside>
    </div>
  )
}
