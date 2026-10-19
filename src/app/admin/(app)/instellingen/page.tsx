'use client'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import { CentInput, Kaart, Melding, PaginaKop, Switch, useMelding } from '@/components/admin/ui'
import type { Instellingen } from '@/lib/instellingen'

export default function InstellingenPagina() {
  const [i, setI] = useState<Instellingen | null>(null)
  const [bezig, setBezig] = useState(false)
  const [test, setTest] = useState<{ ok: boolean; t: string } | null>(null)
  const [origSleutel, setOrigSleutel] = useState('')
  const melding = useMelding()
  useEffect(() => { vraag<Instellingen>('/api/admin/instellingen').then(d => { setI(d); setOrigSleutel(d.betalen.mollieApiKey) }) }, [])
  if (!i) return <p className="text-ink/50">Laden…</p>
  const b = i.bestellen, p = i.printers, z = i.bedrijf, bt = i.betalen
  const zetBt = (x: Partial<typeof bt>) => setI({ ...i, betalen: { ...bt, ...x } })
  const zetB = (x: Partial<typeof b>) => setI({ ...i, bestellen: { ...b, ...x } })
  const zetP = (x: Partial<typeof p>) => setI({ ...i, printers: { ...p, ...x } })
  const zetZ = (x: Partial<typeof z>) => setI({ ...i, bedrijf: { ...z, ...x } })
  const num = (v: string) => Math.max(0, Number(v) || 0)
  return (
    <div className="pb-10">
      <PaginaKop titel="Instellingen">
        <button className="btn-brand" disabled={bezig} onClick={async () => { setBezig(true); try { const d = await vraag<Instellingen>('/api/admin/instellingen', 'PUT', i); setI(d); setOrigSleutel(d.betalen.mollieApiKey); melding.ok('Instellingen opgeslagen') } catch (e) { melding.fout((e as Error).message) } finally { setBezig(false) } }}>{bezig ? 'Opslaan…' : 'Opslaan'}</button>
      </PaginaKop>
      <div className="grid gap-5 lg:grid-cols-2">
        <Kaart titel="Online bestellen" toggle={{ aan: b.actief, onChange: v => zetB({ actief: v }), label: 'Bestellen mogelijk' }}>
          <div className="space-y-3">
            <div><label className="label" htmlFor="bt">Tekst bovenaan de shop</label><input id="bt" className="input" value={b.bannerTekst} onChange={e => zetB({ bannerTekst: e.target.value })} /></div>
            <div><label className="label" htmlFor="bv">Bevestigingstekst</label><textarea id="bv" className="input min-h-[80px]" value={b.bevestigingTekst} onChange={e => zetB({ bevestigingTekst: e.target.value })} /></div>
          </div>
        </Kaart>

        <Kaart titel="Online betalen (Mollie)" uitleg="Laat klanten vooraf betalen met Bancontact, kaart, Apple Pay…">
          <div className="space-y-4">
            <div className="divide-y divide-ink/5">
              <label className="flex items-center justify-between gap-3 py-2"><span><span className="block font-medium">Online betalen</span><span className="text-sm text-ink/60">Via Mollie, vóór de bestelling doorkomt</span></span><Switch aan={bt.onlineActief} onChange={v => zetBt({ onlineActief: v })} /></label>
              <label className="flex items-center justify-between gap-3 py-2"><span><span className="block font-medium">Betalen bij afhalen</span><span className="text-sm text-ink/60">Klant betaalt aan de kassa</span></span><Switch aan={bt.aanKassaActief} onChange={v => zetBt({ aanKassaActief: v })} /></label>
            </div>
            <div>
              <label className="label" htmlFor="mk">Mollie API-sleutel</label>
              <input id="mk" className="input font-mono text-sm" autoComplete="off" spellCheck={false} placeholder="live_… of test_…" value={bt.mollieApiKey} onChange={e => zetBt({ mollieApiKey: e.target.value.trim() })} onFocus={e => { if (e.target.value.includes('•')) zetBt({ mollieApiKey: '' }) }} onBlur={e => { if (!e.target.value) zetBt({ mollieApiKey: origSleutel }) }} />
              <p className="mt-1 text-xs text-ink/50">Te vinden in het Mollie-dashboard → Ontwikkelaars → API-sleutels. Begin met de <strong>test_</strong>-sleutel om alles uit te proberen zonder echt geld. De sleutel wordt nooit volledig getoond.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" className="btn-ghost btn-sm" onClick={async () => {
                  setTest(null)
                  try { const r = await vraag<{ methodes: string[] }>('/api/admin/betalen-test', 'POST'); setTest({ ok: true, t: r.methodes.length ? `Verbonden ✓ Actieve betaalmethodes: ${r.methodes.join(', ')}` : 'Verbonden, maar er staan nog geen betaalmethodes aan in Mollie.' }) }
                  catch (e) { setTest({ ok: false, t: (e as Error).message }) }
                }}>Verbinding testen</button>
                <span className="text-xs text-ink/50">(eerst opslaan)</span>
                {bt.mollieApiKey.startsWith('test_') && <span className="rounded bg-mustard/30 px-2 py-0.5 text-xs font-semibold">TESTMODUS</span>}
              </div>
              {test && <p className={`mt-2 rounded-lg p-2.5 text-sm ${test.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{test.t}</p>}
            </div>
            <div className="rounded-lg bg-cream p-4">
              <p className="mb-1 font-medium">Online betalen vanaf</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                Online betalen kan pas vanaf
                <CentInput className="w-28" cent={bt.onlineVanafCent} toelatenNegatief={false} onChange={c => zetBt({ onlineVanafCent: c })} />
              </div>
              <p className="mt-1 text-xs text-ink/50">€ 0 = altijd. Kleinere bestellingen betalen dan aan de kassa (waar Bancontact gewoon kan). Laat dit bevestigen door je boekhouder.</p>
            </div>
          </div>
        </Kaart>

        <Kaart titel="Servicekost online bestellen" uitleg="Optioneel: een vaste kost voor bestellen via de website — voor iedereen, ongeacht hoe de klant betaalt." toggle={{ aan: bt.servicekostActief, onChange: v => zetBt({ servicekostActief: v, transactiekostCent: v && !bt.transactiekostCent ? 47 : bt.transactiekostCent }), label: 'Servicekost aanrekenen' }}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              Reken
              <CentInput className="w-28" cent={bt.transactiekostCent} toelatenNegatief={false} onChange={c => zetBt({ transactiekostCent: c })} />
              aan bij online bestellingen onder
              <CentInput className="w-28" cent={bt.transactiekostOnderCent} toelatenNegatief={false} onChange={c => zetBt({ transactiekostOnderCent: c })} />
            </div>
            <p className="text-xs text-ink/50">Bedrag incl. btw, zoals de klant het ziet. Grens € 0 = bij elke online bestelling. Wie gewoon in de zaak bestelt, betaalt niets extra.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="tl">Naam op bon en factuur</label><input id="tl" className="input" value={bt.transactiekostLabel} onChange={e => zetBt({ transactiekostLabel: e.target.value })} /></div>
              <div><label className="label" htmlFor="tb">Btw op servicekost</label><select id="tb" className="input" value={bt.transactiekostBtwPct} onChange={e => zetBt({ transactiekostBtwPct: Number(e.target.value) })}>{[21, 12, 6, 0].map(x => <option key={x} value={x}>{x}%</option>)}</select></div>
            </div>
            {bt.transactiekostCent > 0 && <p className="text-xs text-ink/60">Je houdt netto <strong>€ {(bt.transactiekostCent / (1 + bt.transactiekostBtwPct / 100) / 100).toFixed(2).replace('.', ',')}</strong> over per bestelling (excl. {bt.transactiekostBtwPct}% btw).</p>}
            <p className="rounded-lg bg-sand p-3 text-xs text-ink/70">⚖️ In België mag je geen toeslag vragen omdat iemand elektronisch betaalt. Daarom geldt deze kost voor élke online bestelling, ook als de klant aan de kassa betaalt — het is een kost voor de online bestelservice, niet voor de betaling. Toon ze altijd vooraf (dat gebeurt automatisch bij het afrekenen).</p>
          </div>
        </Kaart>

        <Kaart titel="Afhaalmomenten & capaciteit" uitleg="Bepaalt hoeveel er per tijdslot besteld kan worden.">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              Per schijf van
              <CentInput className="w-32" cent={b.capaciteitCentPerSlot} toelatenNegatief={false} onChange={c => zetB({ capaciteitCentPerSlot: c })} />
              per
              <select className="input w-auto" value={b.slotMinuten} onChange={e => zetB({ slotMinuten: Number(e.target.value) })}>{[5, 10, 15, 20, 30, 60].map(m => <option key={m} value={m}>{m} minuten</option>)}</select>
              is afhalen niet meer mogelijk.
            </div>
            <p className="text-xs text-ink/50">Zodra er in een tijdslot voor dit bedrag besteld is, gaat het slot dicht. Zet op € 0 voor onbeperkt.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="mx">Max. bestellingen per slot</label><input id="mx" type="number" min={0} className="input" value={b.maxBestellingenPerSlot} onChange={e => zetB({ maxBestellingenPerSlot: num(e.target.value) })} /><p className="mt-1 text-xs text-ink/50">0 = onbeperkt</p></div>
              <div><label className="label" htmlFor="mv">Minimale voorbereidingstijd</label><div className="flex items-center gap-2"><input id="mv" type="number" min={0} className="input" value={b.minVoorbereidingMinuten} onChange={e => zetB({ minVoorbereidingMinuten: num(e.target.value) })} /><span className="text-sm">min</span></div></div>
              <div><label className="label" htmlFor="ls">Laatste slot vóór sluiten</label><div className="flex items-center gap-2"><input id="ls" type="number" min={0} className="input" value={b.laatsteSlotVoorSluitenMinuten} onChange={e => zetB({ laatsteSlotVoorSluitenMinuten: num(e.target.value) })} /><span className="text-sm">min</span></div></div>
              <div><label className="label" htmlFor="md">Tot hoeveel dagen vooruit bestellen</label><input id="md" type="number" min={0} max={60} className="input" value={b.maxDagenVooruit} onChange={e => zetB({ maxDagenVooruit: num(e.target.value) })} /></div>
            </div>
          </div>
        </Kaart>

        <Kaart titel="No-shows & misbruik" uitleg="Bescherming tegen niet-afgehaalde en valse bestellingen.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="ns">Enkel online betalen vanaf</label><div className="flex items-center gap-2"><input id="ns" type="number" min={0} className="input" value={b.noShowLimiet} onChange={e => zetB({ noShowLimiet: num(e.target.value) })} /><span className="shrink-0 text-sm">no-shows</span></div><p className="mt-1 text-xs text-ink/50">0 = uit</p></div>
            <div><label className="label" htmlFor="mo">Max. open bestellingen “betalen bij afhalen”</label><input id="mo" type="number" min={0} className="input" value={b.maxOpenAanKassa} onChange={e => zetB({ maxOpenAanKassa: num(e.target.value) })} /><p className="mt-1 text-xs text-ink/50">per klant tegelijk · 0 = onbeperkt</p></div>
          </div>
          <div className="mt-3">
            <label className="label">Nieuwe klant: max. bedrag bij betalen aan de kassa</label>
            <CentInput className="w-36" cent={b.maxEersteBestellingCent} toelatenNegatief={false} onChange={c => zetB({ maxEersteBestellingCent: c })} />
            <p className="mt-1 text-xs text-ink/50">Tot de eerste bestelling is afgehaald. Grotere bestellingen moeten online betaald worden. € 0 = onbeperkt.</p>
          </div>
          <p className="mt-3 rounded-lg bg-sand p-3 text-xs text-ink/70">Altijd actief: verborgen lokveld en tijdscontrole tegen bots bij registratie, geen wegwerp-e-mailadressen, maximaal 10 registraties en 15 bestellingen per uur per internetverbinding.</p>
        </Kaart>

        <Kaart titel="Printers (kassa)" uitleg="Rechtstreeks printen gebeurt vanuit de De Sneppe Kassa-app op de tablet (iPad of Android). Gebruik het IP-adres van elke printer in het winkelnetwerk.">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_210px]">
              <div><label className="label" htmlFor="ti">Ticketprinter – IP-adres</label><input id="ti" className="input font-mono" placeholder="192.168.68.50" value={p.ticketIp} onChange={e => zetP({ ticketIp: e.target.value.trim() })} /></div>
              <div><label className="label" htmlFor="tt">Type</label><select id="tt" className="input" value={p.ticketType} onChange={e => zetP({ ticketType: e.target.value as typeof p.ticketType })}><option value="ESCPOS_TCP">Epson – via kassa-app</option><option value="EPSON_EPOS">Epson ePOS – via browser</option><option value="GEEN">Geen</option></select></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_210px]">
              <div><label className="label" htmlFor="si">Stickerprinter bestellingen (rond) – IP-adres</label><input id="si" className="input font-mono" placeholder="192.168.68.239" value={p.stickerIp} onChange={e => zetP({ stickerIp: e.target.value.trim() })} /></div>
              <div><label className="label" htmlFor="st">Type</label><select id="st" className="input" value={p.stickerType} onChange={e => zetP({ stickerType: e.target.value as typeof p.stickerType })}><option value="ZPL_TCP">Labelprinter ZPL (Metapace, Zebra…) – via kassa-app</option><option value="EPSON_EPOS">Epson ePOS – via browser</option><option value="BROWSER">AirPrint (dialoog)</option><option value="GEEN">Geen</option></select></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_210px]">
              <div><label className="label" htmlFor="oi">Etiketprinter opslag (rechthoekig) – IP-adres</label><input id="oi" className="input font-mono" placeholder="192.168.68.139" value={p.opslagIp} onChange={e => zetP({ opslagIp: e.target.value.trim() })} /></div>
              <div><label className="label" htmlFor="ot">Type</label><select id="ot" className="input" value={p.opslagType} onChange={e => zetP({ opslagType: e.target.value as typeof p.opslagType })}><option value="ZPL_TCP">Labelprinter ZPL – via kassa-app</option><option value="GEEN">Geen</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
              <div><label className="label" htmlFor="ob">Opslagetiket breedte (mm)</label><input id="ob" type="number" min={20} max={110} className="input" value={p.opslagBreedteMm} onChange={e => zetP({ opslagBreedteMm: Number(e.target.value) || 50 })} /></div>
              <div><label className="label" htmlFor="oh">Hoogte (mm)</label><input id="oh" type="number" min={15} max={200} className="input" value={p.opslagHoogteMm} onChange={e => zetP({ opslagHoogteMm: Number(e.target.value) || 30 })} /></div>
            </div>
            <label className="flex items-center justify-between gap-3"><span><span className="block font-medium">Automatisch printen</span><span className="text-sm text-ink/60">Nieuwe bestellingen meteen afdrukken (ticket + stickers) op de kassa</span></span><Switch aan={p.autoPrint} onChange={v => zetP({ autoPrint: v })} /></label>
            <p className="rounded-xl bg-sand p-3 text-xs text-ink/70">„Via kassa-app”: de tablet stuurt de opdracht rechtstreeks naar de printer (poort 9100). Dat werkt enkel in de De Sneppe Kassa-app, niet in een gewone browser. Tip: een IP-adres met poort mag ook, bv. <span className="font-mono">192.168.68.139:9100</span>.</p>
          </div>
        </Kaart>

        <Kaart titel="Bedrijfsgegevens" uitleg="Gebruikt op de website, in e-mails en voor Google (structured data).">
          <div className="grid gap-3 sm:grid-cols-2">
            {([['naam', 'Naam'], ['handelsnaam', 'Handelsnaam'], ['adres', 'Straat + nr'], ['postcode', 'Postcode'], ['gemeente', 'Gemeente'], ['telefoon', 'Telefoon'], ['email', 'E-mail'], ['btwNummer', 'Btw-nummer'], ['facebook', 'Facebook-URL'], ['instagram', 'Instagram-URL'], ['googlePlaceId', 'Google reviewlink of Place-ID']] as const).map(([k, l]) => (
              <div key={k}><label className="label" htmlFor={k}>{l}</label><input id={k} className="input" value={String(z[k])} onChange={e => zetZ({ [k]: e.target.value } as Partial<typeof z>)} /></div>
            ))}
            <div><label className="label" htmlFor="lat">Breedtegraad</label><input id="lat" className="input" value={z.lat} onChange={e => zetZ({ lat: Number(e.target.value) })} /></div>
            <div><label className="label" htmlFor="lng">Lengtegraad</label><input id="lng" className="input" value={z.lng} onChange={e => zetZ({ lng: Number(e.target.value) })} /></div>
          </div>
        </Kaart>

        <Kaart titel="Standaard btw-tarief" uitleg="Voor nieuwe producten. Take-away = 6%.">
          <select className="input max-w-[200px]" value={i.standaardBtwPct} onChange={e => setI({ ...i, standaardBtwPct: Number(e.target.value) })}>{[6, 12, 21, 0].map(x => <option key={x} value={x}>{x}%</option>)}</select>
        </Kaart>
      </div>
      <Melding m={melding.m} />
    </div>
  )
}
