'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import AuthFormulier from '@/components/AuthFormulier'
import { Bevestig } from '@/components/Modal'
import Modal from '@/components/Modal'
import { vraag } from '@/components/fetcher'
import { RegelLijst, fmtDag, fmtSlot, type BestellingData } from '@/components/BestelStatus'
import HerbestelKnop from '@/components/HerbestelKnop'
import { euro } from '@/lib/geld'
import MeldingenVraag from '@/components/app/MeldingenVraag'
import { afmeldenToestel, registreerAlsToegestaan } from '@/components/app/native'

type Klant = { onvolledig?: boolean; voornaam: string; naam: string; email: string; adres: string; postcode: string; gemeente: string; geboortedatum: string; telefoon: string; punten: number; mailBestelling: boolean; pushBestelling: boolean; mailNieuws: boolean; mailActies: boolean }
type Tab = 'bestellingen' | 'punten' | 'gegevens' | 'meldingen'
const STATUS: Record<string, string> = { ONTVANGEN: 'Ontvangen', BEZIG: 'Bezig', KLAAR: 'Klaar', AFGEHAALD: 'Afgehaald', NIET_AFGEHAALD: 'Niet afgehaald', GEANNULEERD: 'Geannuleerd' }

export default function Account() {
  const [klant, setKlant] = useState<Klant | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('bestellingen')
  const [ssoFout, setSsoFout] = useState('')
  const laad = () => vraag<{ klant: Klant | null }>('/api/klant/profiel').then(r => { if (r.klant?.onvolledig) { window.location.href = '/account/aanvullen'; return } setKlant(r.klant); if (r.klant) registreerAlsToegestaan().catch(() => {}) }).catch(() => setKlant(null))
  useEffect(() => {
    laad()
    const sso = new URLSearchParams(window.location.search).get('sso')
    const MELD: Record<string, string> = { mislukt: 'Aanmelden is niet gelukt. Probeer opnieuw of meld je aan met e-mail.', verlopen: 'De aanmelding duurde te lang. Probeer opnieuw.', 'geen-email': 'We kregen geen e-mailadres van deze dienst. Meld je aan met e-mail.', 'email-bestaat': 'Er bestaat al een account met dit e-mailadres. Meld je aan met je wachtwoord; daarna kan je ook zo inloggen.', geblokkeerd: 'Dit account is geblokkeerd. Neem contact met ons op.', geannuleerd: 'Aanmelden geannuleerd.', 'niet-beschikbaar': 'Deze aanmeldmethode is nog niet beschikbaar.' }
    if (sso && MELD[sso]) setSsoFout(MELD[sso])
    // Tab volgt de #hash (ook bij klikken in de onderbalk van de app)
    const volg = () => { const h = window.location.hash.replace('#', '') as Tab; setTab(['bestellingen', 'punten', 'gegevens', 'meldingen'].includes(h) ? h : 'bestellingen') }
    volg(); window.addEventListener('hashchange', volg)
    return () => window.removeEventListener('hashchange', volg)
  }, [])

  if (klant === undefined) return <p className="py-20 text-center text-ink/50">Laden…</p>
  if (klant === null) return (
    <div className="container-x max-w-md py-12">
      <h1 className="h-display mb-6 text-3xl">Mijn account</h1>
      {ssoFout && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{ssoFout}</p>}
      <div className="card p-6"><AuthFormulier onKlaar={laad} /></div>
      <AppInfo />
    </div>
  )
  const tabs: { k: Tab; t: string }[] = [{ k: 'bestellingen', t: 'Bestellingen' }, { k: 'punten', t: 'Spaarpunten' }, { k: 'gegevens', t: 'Gegevens' }, { k: 'meldingen', t: 'Meldingen' }]
  return (
    <div className="container-x max-w-3xl py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-display text-3xl sm:text-4xl">Hallo {klant.voornaam}!</h1>
          <p className="text-ink/60">Je hebt <strong className="text-brand-dark">{klant.punten} spaarpunten</strong></p>
        </div>
        <button className="btn-ghost btn-sm" onClick={async () => { await afmeldenToestel(); await vraag('/api/klant/logout', 'POST'); setKlant(null) }}>Afmelden</button>
      </div>
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
        {tabs.map(t => <button key={t.k} onClick={() => { setTab(t.k); history.replaceState(null, '', '#' + t.k) }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === t.k ? 'bg-ink text-white' : 'bg-white hover:bg-sand'}`}>{t.t}</button>)}
      </div>
      <div className="mt-6">
        <MeldingenVraag tekst="Zet meldingen aan: dan weet je meteen wanneer je bestelling klaar is." />
        {tab === 'bestellingen' && <Bestellingen />}
        {tab === 'punten' && <Punten onWijziging={laad} />}
        {tab === 'gegevens' && <Gegevens klant={klant} onOpgeslagen={setKlant} onVerwijderd={() => setKlant(null)} />}
        {tab === 'meldingen' && <Meldingen klant={klant} onOpgeslagen={setKlant} />}
      </div>
      {(tab === 'gegevens' || tab === 'meldingen') && <AppInfo />}
    </div>
  )
}

// In de app is de footer verborgen: info en juridische pagina's hier bereikbaar
function AppInfo() {
  const links = [{ href: '/over-ons', t: 'Over ons' }, { href: '/contact', t: 'Contact & openingsuren' }, { href: '/algemene-voorwaarden', t: 'Algemene voorwaarden' }, { href: '/privacy', t: 'Privacyverklaring' }]
  return (
    <div className="alleen-app mt-8 flex-col overflow-hidden rounded-xl bg-white shadow-card">
      {links.map(l => <Link key={l.href} href={l.href} className="flex items-center justify-between border-b border-ink/5 px-5 py-4 font-medium last:border-0">{l.t}<span aria-hidden className="text-ink/30">›</span></Link>)}
    </div>
  )
}

function Bestellingen() {
  const [lijst, setLijst] = useState<BestellingData[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => { vraag<BestellingData[]>('/api/klant/bestellingen').then(setLijst).catch(() => setLijst([])) }, [])
  if (!lijst) return <p className="text-ink/50">Laden…</p>
  if (!lijst.length) return <div className="card p-8 text-center"><p className="text-ink/60">Je hebt nog niets besteld.</p><Link href="/bestellen" className="btn-brand mt-4">Bestel nu</Link></div>
  return (
    <div className="space-y-3">
      {lijst.map(b => (
        <div key={b.id} className="card overflow-hidden">
          <button className="flex w-full items-center gap-4 p-4 text-left" onClick={() => setOpen(open === b.id ? null : b.id)}>
            <div className="flex-1">
              <p className="font-semibold capitalize">{fmtDag(b.afhaalTijd)} · {fmtSlot(b.afhaalTijd, b.slotMinuten)}</p>
              <p className="text-sm text-ink/60">#{b.nummer} · {b.regels.reduce((s, r) => s + r.aantal, 0)} items · {euro(b.totaalCent)}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.status === 'GEANNULEERD' ? 'bg-red-50 text-red-700' : b.status === 'KLAAR' || b.status === 'AFGEHAALD' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-light text-brand-dark'}`}>{b.betaalStatus === 'MISLUKT' ? 'Niet betaald' : STATUS[b.status]}</span>
          </button>
          {open === b.id && (
            <div className="border-t border-ink/10 px-4 pb-4">
              <RegelLijst regels={b.regels} />
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <HerbestelKnop id={b.id} klein />
                <Link href={`/bestelling/${b.id}`} className="text-sm font-semibold text-brand-dark underline">Details</Link>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

type Beloning = { id: string; naam: string; omschrijving: string | null; punten: number; afbeelding: string | null }
type Voucher = { id: string; code: string; status: string; punten: number; aangemaaktOp: string; beloning: Beloning }
type LoyaltyData = { punten: number; beschikbaar: number; beloningen: Beloning[]; vouchers: Voucher[]; transacties: { id: string; punten: number; reden: string; aangemaaktOp: string }[] }

function VoucherQr({ v, onSluit }: { v: Voucher; onSluit: () => void }) {
  const [src, setSrc] = useState('')
  useEffect(() => { QRCode.toDataURL(v.code, { width: 480, margin: 1 }).then(setSrc) }, [v.code])
  return (
    <Modal titel={v.beloning.naam} onSluit={onSluit}>
      <p className="text-ink/70">Toon deze QR-code aan de kassa. Na het scannen gaan er {v.punten} punten van je teller.</p>
      {src && <img src={src} alt={`QR-code ${v.code}`} className="mx-auto my-4 w-64" />}
      <p className="text-center font-mono text-lg font-bold tracking-widest">{v.code}</p>
    </Modal>
  )
}

function Punten({ onWijziging }: { onWijziging: () => void }) {
  const [d, setD] = useState<LoyaltyData | null>(null)
  const [toon, setToon] = useState<Voucher | null>(null)
  const [vraagBel, setVraagBel] = useState<Beloning | null>(null)
  const [fout, setFout] = useState('')
  const laad = () => vraag<LoyaltyData>('/api/klant/loyalty').then(setD)
  useEffect(() => { laad() }, [])
  if (!d) return <p className="text-ink/50">Laden…</p>
  const open = d.vouchers.filter(v => v.status === 'OPEN')
  return (
    <div className="space-y-6">
      <div className="card bg-ink p-6 text-white">
        <p className="text-white/70">Jouw spaarpunten</p>
        <p className="font-display text-5xl font-bold">{d.punten}</p>
        {d.beschikbaar !== d.punten && <p className="text-sm text-white/70">{d.punten - d.beschikbaar} punten gereserveerd voor openstaande vouchers</p>}
        <p className="mt-2 text-sm text-white/70">Je spaart punten bij elke bestelling van producten met ⭐. De punten worden bijgeschreven zodra je bestelling klaar is.</p>
      </div>
      {open.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">Klaar om in te wisselen</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {open.map(v => (
              <button key={v.id} onClick={() => setToon(v)} className="card flex items-center gap-4 p-4 text-left ring-2 ring-brand">
                <span className="text-3xl">🎁</span>
                <span className="flex-1"><span className="block font-semibold">{v.beloning.naam}</span><span className="text-sm text-ink/60">Tik om QR-code te tonen</span></span>
              </button>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Beloningen</h2>
        {!d.beloningen.length && <p className="text-ink/60">Er zijn momenteel geen beloningen.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {d.beloningen.map(b => {
            const pct = Math.min(100, Math.round((d.beschikbaar / b.punten) * 100))
            const kan = d.beschikbaar >= b.punten
            return (
              <div key={b.id} className="card p-4">
                <div className="flex items-start gap-3">
                  {b.afbeelding ? <img src={b.afbeelding} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-xl bg-sand text-2xl">🎁</span>}
                  <div className="flex-1">
                    <p className="font-semibold">{b.naam}</p>
                    <p className="text-sm text-ink/60">{b.punten} punten</p>
                    {b.omschrijving && <p className="text-sm text-ink/60">{b.omschrijving}</p>}
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand"><div className="h-full bg-brand" style={{ width: `${pct}%` }} /></div>
                <button className="btn-brand btn-sm mt-3 w-full" disabled={!kan} onClick={() => setVraagBel(b)}>{kan ? 'Verzilveren' : `Nog ${b.punten - d.beschikbaar} punten`}</button>
              </div>
            )
          })}
        </div>
      </section>
      {d.transacties.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">Historiek</h2>
          <ul className="card divide-y divide-ink/10">
            {d.transacties.map(t => <li key={t.id} className="flex justify-between px-4 py-2.5 text-sm"><span>{t.reden}<span className="block text-xs text-ink/50">{new Date(t.aangemaaktOp).toLocaleDateString('nl-BE', { timeZone: 'Europe/Brussels' })}</span></span><span className={`font-semibold ${t.punten < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{t.punten > 0 ? '+' : ''}{t.punten}</span></li>)}
          </ul>
        </section>
      )}
      {fout && <p className="text-red-700">{fout}</p>}
      {toon && <VoucherQr v={toon} onSluit={() => setToon(null)} />}
      {vraagBel && (
        <Bevestig titel="Beloning verzilveren?" knop="Verzilveren" tekst={<>Je maakt een voucher aan voor <strong>{vraagBel.naam}</strong>. Toon de QR-code aan de kassa; dan gaan er {vraagBel.punten} punten van je teller.</>}
          onNee={() => setVraagBel(null)}
          onJa={async () => {
            try { const v = await vraag<Voucher>('/api/klant/vouchers', 'POST', { beloningId: vraagBel.id }); setVraagBel(null); await laad(); onWijziging(); setToon({ ...v, beloning: vraagBel }) }
            catch (e) { setFout((e as Error).message); setVraagBel(null) }
          }} />
      )}
    </div>
  )
}

function Gegevens({ klant, onOpgeslagen, onVerwijderd }: { klant: Klant; onOpgeslagen: (k: Klant) => void; onVerwijderd: () => void }) {
  const [v, setV] = useState(klant)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [verwijder, setVerwijder] = useState(false)
  const [bezig, setBezig] = useState(false)
  const veld = (k: keyof Klant, label: string, type = 'text', extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="label" htmlFor={k}>{label}</label><input id={k} type={type} className="input" required value={String(v[k] ?? '')} onChange={e => setV(x => ({ ...x, [k]: e.target.value }))} {...extra} /></div>
  )
  return (
    <form className="card space-y-3 p-6" onSubmit={async e => {
      e.preventDefault(); setMsg(null)
      try { const r = await vraag<{ klant: Klant }>('/api/klant/profiel', 'PUT', v); onOpgeslagen(r.klant); setMsg({ ok: true, t: 'Je gegevens zijn opgeslagen.' }) }
      catch (err) { setMsg({ ok: false, t: (err as Error).message }) }
    }}>
      <div className="grid gap-3 sm:grid-cols-2">{veld('voornaam', 'Voornaam')}{veld('naam', 'Naam')}</div>
      {veld('adres', 'Adres')}
      <div className="grid grid-cols-[110px_1fr] gap-3">{veld('postcode', 'Postcode', 'text', { maxLength: 4, inputMode: 'numeric' })}{veld('gemeente', 'Gemeente')}</div>
      <div className="grid gap-3 sm:grid-cols-2">{veld('geboortedatum', 'Geboortedatum', 'date')}{veld('telefoon', 'Telefoon', 'tel')}</div>
      {veld('email', 'E-mailadres', 'email')}
      {msg && <p className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.t}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button className="btn-brand">Opslaan</button>
        <button type="button" className="text-sm text-red-600 underline" onClick={() => setVerwijder(true)}>Account verwijderen</button>
      </div>
      {verwijder && (
        <Bevestig titel="Account verwijderen?" gevaarlijk knop="Definitief verwijderen" bezig={bezig}
          tekst={<>Je account, je gegevens en je <strong>{klant.punten} spaarpunten</strong> worden definitief verwijderd. Je bestelhistoriek wordt geanonimiseerd. Dit kan niet ongedaan gemaakt worden.</>}
          onNee={() => setVerwijder(false)}
          onJa={async () => { setBezig(true); await vraag('/api/klant/profiel', 'DELETE'); onVerwijderd() }} />
      )}
    </form>
  )
}

function Meldingen({ klant: _k, onOpgeslagen: _o }: { klant: Klant; onOpgeslagen: (k: Klant) => void }) {
  type O = { id: string; naam: string; omschrijving: string | null; systeem: boolean; mail: boolean; push: boolean }
  const [lijst, setLijst] = useState<O[] | null>(null)
  const [ok, setOk] = useState(false)
  useEffect(() => { vraag<O[]>('/api/klant/voorkeuren').then(setLijst) }, [])
  if (!lijst) return <p className="text-ink/50">Laden…</p>
  const zet = async (o: O, veld: 'mail' | 'push', v: boolean) => {
    setLijst(l => l!.map(x => x.id === o.id ? { ...x, [veld]: v } : x)); setOk(false)
    await vraag('/api/klant/voorkeuren', 'PUT', { onderwerpId: o.id, [veld]: v }); setOk(true)
  }
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-ink/10 bg-sand/50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-ink/50"><span>Waarover?</span><span className="w-12 text-center">E-mail</span><span className="w-12 text-center">App</span></div>
      {lijst.map(o => (
        <div key={o.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-ink/5 px-5 py-4 last:border-0">
          <span><span className="block font-semibold">{o.naam}</span>{o.omschrijving && <span className="text-sm text-ink/60">{o.omschrijving}</span>}</span>
          <span className="flex w-12 justify-center"><input type="checkbox" className="h-6 w-6 accent-brand" checked={o.mail} onChange={e => zet(o, 'mail', e.target.checked)} aria-label={`${o.naam} per e-mail`} /></span>
          <span className="flex w-12 justify-center"><input type="checkbox" className="h-6 w-6 accent-brand" checked={o.push} onChange={e => zet(o, 'push', e.target.checked)} aria-label={`${o.naam} in de app`} /></span>
        </div>
      ))}
      <p className="p-4 text-sm text-ink/50">{ok ? '✓ Opgeslagen' : 'De bevestiging van je bestelling krijg je altijd per mail. “App” = een melding op je telefoon via de app van De Sneppe.'}</p>
    </div>
  )
}
