'use client'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { vraag } from '@/components/fetcher'
import { Kaart, Melding, PaginaKop, Switch, useMelding } from '@/components/admin/ui'
import { VOORBEELD, lijnenNaarHtml, printBestelling, stickerLijnen, stickers, tekensPerRegel, ticketLijnen } from '@/components/print'
import type { Instellingen, StickerOntwerp, TicketOntwerp } from '@/lib/instellingen'

function Vink({ label, aan, onChange }: { label: string; aan: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 py-1.5"><span className="text-sm">{label}</span><Switch aan={aan} onChange={onChange} label={label} /></label>
}

const PX_PER_MM = 6

function StickerVoorbeeld({ html, o }: { html: string; o: StickerOntwerp }) {
  const binnen = useRef<HTMLDivElement>(null)
  const [past, setPast] = useState(true)
  const w = o.breedteMm * PX_PER_MM
  const hgt = (o.rond ? o.breedteMm : o.hoogteMm) * PX_PER_MM
  // In een cirkel is enkel het ingeschreven vierkant (±70%) veilig bedrukbaar
  const pad = o.rond ? Math.round(w * 0.15) : 8
  useLayoutEffect(() => {
    const el = binnen.current
    if (el) setPast(el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1)
  }, [html, w, hgt, pad])
  return (
    <div>
      <div className={`relative overflow-hidden border bg-white font-mono text-[13px] leading-tight text-black shadow-lg ${o.rond ? 'rounded-full' : 'rounded-md'} ${past ? 'border-ink/20' : 'border-red-500 ring-2 ring-red-400'}`} style={{ width: w, height: hgt }}>
        <div ref={binnen} className={`absolute flex flex-col ${o.rond ? 'justify-center' : ''}`} style={{ inset: pad }}>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
      {!past && <p className="mt-1 max-w-[260px] text-xs font-semibold text-red-600">Past niet: zet “groot” uit, verberg een onderdeel of kies een grotere sticker.</p>}
    </div>
  )
}

export default function PrintOntwerp() {
  const [inst, setInst] = useState<Instellingen | null>(null)
  const [tab, setTab] = useState<'ticket' | 'sticker'>('ticket')
  const [bezig, setBezig] = useState(false)
  const melding = useMelding()
  useEffect(() => { vraag<Instellingen>('/api/admin/instellingen').then(setInst) }, [])

  const tLijnen = useMemo(() => inst ? lijnenNaarHtml(ticketLijnen(VOORBEELD, inst.ticketOntwerp)) : '', [inst])
  const sLijst = useMemo(() => inst ? stickers(VOORBEELD).map(s => lijnenNaarHtml(stickerLijnen(s, inst.stickerOntwerp))) : [], [inst])
  if (!inst) return <p className="text-ink/50">Laden…</p>
  const t = inst.ticketOntwerp, s = inst.stickerOntwerp
  const zetT = (x: Partial<TicketOntwerp>) => setInst({ ...inst, ticketOntwerp: { ...t, ...x } })
  const zetS = (x: Partial<StickerOntwerp>) => setInst({ ...inst, stickerOntwerp: { ...s, ...x } })

  async function opslaan() {
    setBezig(true)
    try { setInst(await vraag<Instellingen>('/api/admin/instellingen', 'PUT', { ticketOntwerp: t, stickerOntwerp: s })); melding.ok('Ontwerp opgeslagen') }
    catch (e) { melding.fout((e as Error).message) } finally { setBezig(false) }
  }
  async function testprint() {
    try {
      await printBestelling(VOORBEELD, inst!.printers, { ticket: t, sticker: s }, tab === 'ticket' ? { ticket: true } : { stickers: true })
      melding.ok('Testprint verstuurd')
    } catch (e) { melding.fout((e as Error).message) }
  }

  return (
    <div className="pb-10">
      <PaginaKop titel="Ticket & sticker" sub="Bepaal wat er op het bestelticket en de stickers komt. Het voorbeeld toont een fictieve bestelling.">
        <button className="btn-ghost" onClick={testprint}>🖨 Testprint {tab}</button>
        <button className="btn-brand" disabled={bezig} onClick={opslaan}>{bezig ? 'Opslaan…' : 'Opslaan'}</button>
      </PaginaKop>
      <div className="mb-5 inline-grid grid-cols-2 rounded-lg bg-white p-1 text-sm font-semibold shadow-card">
        <button onClick={() => setTab('ticket')} className={`rounded-md px-5 py-2 ${tab === 'ticket' ? 'bg-ink text-white' : ''}`}>🧾 Bestelticket</button>
        <button onClick={() => setTab('sticker')} className={`rounded-md px-5 py-2 ${tab === 'sticker' ? 'bg-ink text-white' : ''}`}>🏷️ Sticker</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        {tab === 'ticket' ? (
          <div className="space-y-5">
            <Kaart titel="Papier & kop">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label" htmlFor="pp">Papierbreedte</label><select id="pp" className="input" value={t.papierMm} onChange={e => zetT({ papierMm: Number(e.target.value) })}><option value={80}>80 mm (standaard)</option><option value={58}>58 mm (smal)</option></select></div>
                <div><label className="label" htmlFor="kp">Aantal exemplaren</label><input id="kp" type="number" min={1} max={3} className="input" value={t.kopieen} onChange={e => zetT({ kopieen: Math.min(3, Math.max(1, Number(e.target.value))) })} /></div>
              </div>
              <div className="mt-3"><Vink label="Logo bovenaan" aan={t.logo} onChange={logo => zetT({ logo })} /></div>
              <div className="mt-2"><label className="label" htmlFor="kt">Koptekst (eerste regel wordt groot gedrukt)</label><textarea id="kt" className="input min-h-[70px] font-mono text-sm" value={t.koptekst} onChange={e => zetT({ koptekst: e.target.value })} /></div>
            </Kaart>
            <Kaart titel="Wat staat er op het ticket?">
              <div className="divide-y divide-ink/5">
                <Vink label="Klantnaam en afhaaltijd groot" aan={t.klantGroot} onChange={klantGroot => zetT({ klantGroot })} />
                <Vink label="Producten groot" aan={t.productGroot} onChange={productGroot => zetT({ productGroot })} />
                <Vink label="Bestelnummer" aan={t.toonNummer} onChange={toonNummer => zetT({ toonNummer })} />
                <Vink label="Telefoonnummer klant" aan={t.toonTelefoon} onChange={toonTelefoon => zetT({ toonTelefoon })} />
                <Vink label="Tijdstip van bestellen" aan={t.toonBesteltijd} onChange={toonBesteltijd => zetT({ toonBesteltijd })} />
                <Vink label="Prijs per product" aan={t.toonPrijzen} onChange={toonPrijzen => zetT({ toonPrijzen })} />
                <Vink label="Totaalbedrag" aan={t.toonTotaal} onChange={toonTotaal => zetT({ toonTotaal })} />
                <Vink label="Opmerking van de klant" aan={t.toonOpmerking} onChange={toonOpmerking => zetT({ toonOpmerking })} />
                <Vink label="Betaald online / te betalen aan de kassa" aan={t.toonBetaalstatus} onChange={toonBetaalstatus => zetT({ toonBetaalstatus })} />
              </div>
              <div className="mt-3"><label className="label" htmlFor="vt">Voettekst</label><textarea id="vt" className="input min-h-[60px] font-mono text-sm" value={t.voettekst} onChange={e => zetT({ voettekst: e.target.value })} /></div>
            </Kaart>
          </div>
        ) : (
          <div className="space-y-5">
            <Kaart titel="Formaat" uitleg="Vorm en afmeting van één sticker op de rol.">
              <div className="mb-3 inline-grid grid-cols-2 rounded-lg bg-sand p-1 text-sm font-semibold">
                <button type="button" onClick={() => zetS({ rond: true })} className={`rounded-md px-4 py-1.5 ${s.rond ? 'bg-white shadow' : ''}`}>⬤ Rond</button>
                <button type="button" onClick={() => zetS({ rond: false })} className={`rounded-md px-4 py-1.5 ${!s.rond ? 'bg-white shadow' : ''}`}>▬ Rechthoekig</button>
              </div>
              {s.rond ? (
                <div className="max-w-[200px]"><label className="label" htmlFor="sd">Diameter (mm)</label><input id="sd" type="number" min={20} max={100} className="input" value={s.breedteMm} onChange={e => zetS({ breedteMm: Number(e.target.value), hoogteMm: Number(e.target.value) })} /></div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label" htmlFor="sb">Breedte (mm)</label><input id="sb" type="number" min={20} max={112} className="input" value={s.breedteMm} onChange={e => zetS({ breedteMm: Number(e.target.value) })} /></div>
                  <div><label className="label" htmlFor="sh">Hoogte (mm)</label><input id="sh" type="number" min={15} max={200} className="input" value={s.hoogteMm} onChange={e => zetS({ hoogteMm: Number(e.target.value) })} /></div>
                </div>
              )}
              <div className="mt-3"><Vink label="Logo bovenaan" aan={s.logo} onChange={logo => zetS({ logo })} /></div>
            </Kaart>
            <Kaart titel="Wat staat er op de sticker?">
              <div className="divide-y divide-ink/5">
                <Vink label="Klantnaam groot" aan={s.klantGroot} onChange={klantGroot => zetS({ klantGroot })} />
                <Vink label="Productnaam groot" aan={s.productGroot} onChange={productGroot => zetS({ productGroot })} />
                <Vink label="Gekozen opties (bv. bruin broodje)" aan={s.toonKeuzes} onChange={toonKeuzes => zetS({ toonKeuzes })} />
                <Vink label="Aanpassingen (bv. zonder augurk)" aan={s.toonAanpassingen} onChange={toonAanpassingen => zetS({ toonAanpassingen })} />
                <Vink label="Bestelnummer" aan={s.toonNummer} onChange={toonNummer => zetS({ toonNummer })} />
                <Vink label="Afhaaltijd" aan={s.toonAfhaaltijd} onChange={toonAfhaaltijd => zetS({ toonAfhaaltijd })} />
                <Vink label="Volgnummer (1/2, 2/2…)" aan={s.toonVolgnummer} onChange={toonVolgnummer => zetS({ toonVolgnummer })} />
              </div>
              <div className="mt-3"><label className="label" htmlFor="sv">Extra tekst onderaan</label><textarea id="sv" className="input min-h-[60px] font-mono text-sm" value={s.voettekst} onChange={e => zetS({ voettekst: e.target.value })} placeholder="Bv. Smakelijk! – De Sneppe" /></div>
            </Kaart>
          </div>
        )}

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-sm font-semibold text-ink/60">Voorbeeld</p>
          {tab === 'ticket' ? (
            <div className="rounded-sm bg-white p-4 font-mono text-[13px] text-black shadow-xl" style={{ width: `calc(${tekensPerRegel(t.papierMm)}ch + 2rem)` }}>
              <div dangerouslySetInnerHTML={{ __html: tLijnen }} />
              <div className="mt-4 border-t-2 border-dotted border-ink/30 pt-1 text-center text-[10px] text-ink/40">✂ afsnijden</div>
            </div>
          ) : (
            <div className="space-y-3">
              {sLijst.map((html, i) => <StickerVoorbeeld key={i} html={html} o={s} />)}
              <p className="max-w-xs text-xs text-ink/50">Enkel producten met “Sticker printen bij bestelling” krijgen een sticker — één per stuk. Valt tekst buiten de rand? Maak de sticker hoger of zet “groot” uit.</p>
            </div>
          )}
        </div>
      </div>
      <Melding m={melding.m} />
    </div>
  )
}
