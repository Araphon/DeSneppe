'use client'
import { useEffect, useRef, useState } from 'react'
import { vraag } from './fetcher'
import SsoKnoppen from './SsoKnoppen'

type Modus = 'login' | 'registreer' | 'vergeten'

const leeg = { voornaam: '', naam: '', adres: '', postcode: '', gemeente: '', geboortedatum: '', telefoon: '', email: '', wachtwoord: '', mailNieuws: false, mailActies: false, akkoord: false }

export default function AuthFormulier({ onKlaar, startModus = 'login' }: { onKlaar: () => void; startModus?: Modus }) {
  const [modus, setModus] = useState<Modus>(startModus)
  const [v, setV] = useState(leeg)
  const [fout, setFout] = useState('')
  const [melding, setMelding] = useState('')
  const [bezig, setBezig] = useState(false)
  const start = useRef(Date.now())
  const [lokveld, setLokveld] = useState('')
  const [tsKey, setTsKey] = useState('')
  const [tsToken, setTsToken] = useState('')
  const tsVak = useRef<HTMLDivElement>(null)
  // Cloudflare Turnstile (enkel als de sleutel ingesteld is)
  useEffect(() => {
    if (modus !== 'registreer') return
    fetch('/api/betalen').then(r => r.json()).then(o => setTsKey(o.turnstileSiteKey || '')).catch(() => {})
  }, [modus])
  useEffect(() => {
    if (!tsKey || !tsVak.current) return
    type TS = { render: (el: HTMLElement, o: object) => void }
    const w = window as unknown as { turnstile?: TS }
    const render = () => w.turnstile?.render(tsVak.current!, { sitekey: tsKey, language: 'nl', callback: (t: string) => setTsToken(t) })
    if (w.turnstile) { render(); return }
    const sc = document.createElement('script')
    sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    sc.async = true; sc.onload = render
    document.head.appendChild(sc)
  }, [tsKey])
  const zet = (k: keyof typeof leeg) => (e: React.ChangeEvent<HTMLInputElement>) => setV(x => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function verstuur(e: React.FormEvent) {
    e.preventDefault()
    setFout(''); setMelding(''); setBezig(true)
    try {
      if (modus === 'login') { await vraag('/api/klant/login', 'POST', { email: v.email, wachtwoord: v.wachtwoord }); onKlaar() }
      else if (modus === 'registreer') {
        if (!v.akkoord) throw new Error('Ga akkoord met de algemene voorwaarden en de privacyverklaring om verder te gaan.')
        await vraag('/api/klant/registreren', 'POST', { ...v, website: lokveld, formTijd: Date.now() - start.current, turnstile: tsToken }); onKlaar()
      } else {
        await vraag('/api/klant/wachtwoord-vergeten', 'POST', { email: v.email })
        setMelding('Als er een account bestaat met dit e-mailadres, ontvang je zo een mail om een nieuw wachtwoord in te stellen.')
      }
    } catch (err) { setFout((err as Error).message) } finally { setBezig(false) }
  }

  return (
    <div>
      {modus !== 'vergeten' && <SsoKnoppen />}
      {modus !== 'vergeten' && (
        <div className="mb-5 grid grid-cols-2 rounded-full bg-sand p-1 text-sm font-semibold">
          <button type="button" onClick={() => setModus('login')} className={`rounded-full py-2 ${modus === 'login' ? 'bg-white shadow' : ''}`}>Aanmelden</button>
          <button type="button" onClick={() => setModus('registreer')} className={`rounded-full py-2 ${modus === 'registreer' ? 'bg-white shadow' : ''}`}>Account aanmaken</button>
        </div>
      )}
      <form onSubmit={verstuur} className="relative space-y-3">
        {modus === 'registreer' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="vn">Voornaam</label><input id="vn" className="input" required autoComplete="given-name" value={v.voornaam} onChange={zet('voornaam')} /></div>
              <div><label className="label" htmlFor="nm">Naam</label><input id="nm" className="input" required autoComplete="family-name" value={v.naam} onChange={zet('naam')} /></div>
            </div>
            <div><label className="label" htmlFor="ad">Adres</label><input id="ad" className="input" required autoComplete="street-address" placeholder="Straat en huisnummer" value={v.adres} onChange={zet('adres')} /></div>
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <div><label className="label" htmlFor="pc">Postcode</label><input id="pc" className="input" required inputMode="numeric" maxLength={4} autoComplete="postal-code" value={v.postcode} onChange={zet('postcode')} /></div>
              <div><label className="label" htmlFor="gm">Gemeente</label><input id="gm" className="input" required autoComplete="address-level2" value={v.gemeente} onChange={zet('gemeente')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="gb">Geboortedatum</label><input id="gb" type="date" className="input" required autoComplete="bday" value={v.geboortedatum} onChange={zet('geboortedatum')} /></div>
              <div><label className="label" htmlFor="tl">Telefoon</label><input id="tl" type="tel" className="input" required autoComplete="tel" value={v.telefoon} onChange={zet('telefoon')} /></div>
            </div>
          </>
        )}
        <div><label className="label" htmlFor="em">E-mailadres</label><input id="em" type="email" className="input" required autoComplete="email" value={v.email} onChange={zet('email')} /></div>
        {modus !== 'vergeten' && (
          <div>
            <label className="label" htmlFor="ww">Wachtwoord</label>
            <input id="ww" type="password" className="input" required minLength={modus === 'registreer' ? 8 : 1} autoComplete={modus === 'login' ? 'current-password' : 'new-password'} value={v.wachtwoord} onChange={zet('wachtwoord')} />
            {modus === 'registreer' && <p className="mt-1 text-xs text-ink/50">Minstens 8 tekens</p>}
          </div>
        )}
        {modus === 'registreer' && (
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>Website<input tabIndex={-1} autoComplete="off" value={lokveld} onChange={e => setLokveld(e.target.value)} /></label>
          </div>
        )}
        {modus === 'registreer' && (
          <div className="space-y-2 pt-1 text-sm">
            <label className="flex gap-2"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={v.mailActies} onChange={zet('mailActies')} />Ja, stuur me acties, nieuwe broodjes en een verjaardagsverrassing. Je kiest later zelf welke berichten je wil.</label>
            <label className="flex gap-2"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={v.akkoord} onChange={zet('akkoord')} required />Ik ga akkoord met de <a href="/algemene-voorwaarden" target="_blank" className="underline">algemene voorwaarden</a> en de <a href="/privacy" target="_blank" className="underline">privacyverklaring</a></label>
          </div>
        )}
        {modus === 'registreer' && tsKey && <div ref={tsVak} className="min-h-[65px]" />}
        {fout && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{fout}</p>}
        {melding && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{melding}</p>}
        <button className="btn-brand w-full py-3" disabled={bezig}>
          {bezig ? 'Even geduld…' : modus === 'login' ? 'Aanmelden' : modus === 'registreer' ? 'Account aanmaken' : 'Stuur link'}
        </button>
        <p className="text-center text-sm">
          {modus === 'login' && <button type="button" className="text-ink/60 underline" onClick={() => setModus('vergeten')}>Wachtwoord vergeten?</button>}
          {modus === 'vergeten' && <button type="button" className="text-ink/60 underline" onClick={() => setModus('login')}>Terug naar aanmelden</button>}
        </p>
      </form>
    </div>
  )
}
