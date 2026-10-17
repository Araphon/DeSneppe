'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import { Bevestig } from '@/components/Modal'
import FotoUpload from '@/components/admin/FotoUpload'
import { Kaart, Melding, Switch, useMelding } from '@/components/admin/ui'
import { triggerTekst } from '@/components/admin/marketingHulp'

type C = {
  id: string; naam: string; type: 'EENMALIG' | 'AUTOMATISCH'; status: string; onderwerpId: string; klantgroepId: string | null; viaMail: boolean; viaPush: boolean
  onderwerpRegel: string; titel: string; tekst: string; knopTekst: string | null; knopUrl: string | null; afbeelding: string | null; pushTekst: string | null; cadeauBeloningId: string | null
  geplandOp: string | null; herhaling: string; trigger: { soort?: string; dagen?: number; uren?: number } | null; minDagenTussen: number; systeemSleutel: string | null
  ontvangers: number; log: { id: string; klant: string; kanaal: string; status: string; reden: string | null; verzondenOp: string }[]
}
type Opt = { id: string; naam: string }

const PLACEHOLDERS = [['{voornaam}', 'voornaam'], ['{naam}', 'achternaam'], ['{punten}', 'spaarpunten'], ['{site}', 'websiteadres'], ['{reviewLink}', 'Google-review'], ['{cadeau}', 'naam cadeau'], ['{vouchercode}', 'vouchercode']]
const TRIGGERS = [
  { k: 'VERJAARDAG', t: 'Op de verjaardag van de klant' },
  { k: 'INACTIEF', t: 'X dagen na de laatste bestelling' },
  { k: 'NA_AFHALEN', t: 'X uur na het afhalen van een bestelling' },
  { k: 'NIEUWE_KLANT', t: 'Na registratie (welkom)' },
]
const lokaal = (iso: string | null) => iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''

function Voorbeeld({ c }: { c: C }) {
  const v = (s: string) => s.replace(/\{voornaam\}/g, 'Jan').replace(/\{naam\}/g, 'Peeters').replace(/\{punten\}/g, '120').replace(/\{cadeau\}/g, 'Gratis koffie').replace(/\{vouchercode\}/g, 'SN-AB12CD34EF').replace(/\{site\}/g, '').replace(/\{reviewLink\}/g, '#')
  return (
    <div className="overflow-hidden rounded-xl bg-[#FBF7F1] p-3 text-[#141414] shadow-inner">
      <p className="mb-2 px-1 text-xs text-ink/50">Onderwerp: <strong className="text-ink">{v(c.onderwerpRegel)}</strong></p>
      <div className="overflow-hidden rounded-xl bg-white">
        <div className="bg-[#141414] px-5 py-3"><img src="/logo-wit.png" alt="" className="h-9" /></div>
        <div className="space-y-3 p-5 text-sm leading-relaxed">
          {c.afbeelding && <img src={c.afbeelding} alt="" className="w-full rounded-lg" />}
          <h1 className="text-lg font-bold">{v(c.titel)}</h1>
          {v(c.tekst).split(/\n\s*\n/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
          {c.cadeauBeloningId && <p>🎁 <strong>Cadeau</strong> — toon je voucher in je account aan de kassa.</p>}
          {c.knopTekst && c.knopUrl && <p className="pt-2"><span className="inline-block rounded-full bg-[#F2B124] px-5 py-2.5 font-bold text-[#141414]">{v(c.knopTekst)}</span></p>}
        </div>
        <div className="bg-[#F2EADF] px-5 py-3 text-[11px] text-ink/60">De Sneppe bij Luna · Bruggesteenweg 83, 8760 Meulebeke<br /><u>Afmelden</u> · <u>Meldingsvoorkeuren</u></div>
      </div>
      {c.viaPush && <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs shadow"><p className="font-semibold">📱 De Sneppe</p><p>{v(c.pushTekst || c.titel)}</p></div>}
    </div>
  )
}

export default function CampagneEditor({ params }: { params: { id: string } }) {
  const router = useRouter()
  const melding = useMelding()
  const [c, setC] = useState<C | null>(null)
  const [onderwerpen, setOnderwerpen] = useState<Opt[]>([])
  const [groepen, setGroepen] = useState<(Opt & { aantal: number })[]>([])
  const [beloningen, setBeloningen] = useState<Opt[]>([])
  const [gewijzigd, setGewijzigd] = useState(false)
  const [plan, setPlan] = useState('')
  const [bevestig, setBevestig] = useState<'nu' | 'weg' | null>(null)
  const [testMail, setTestMail] = useState('')
  const laad = () => vraag<C>(`/api/admin/marketing/campagnes/${params.id}`).then(d => { setC(d); setPlan(lokaal(d.geplandOp)) })
  useEffect(() => {
    laad()
    vraag<Opt[]>('/api/admin/marketing/onderwerpen').then(setOnderwerpen)
    vraag<(Opt & { aantal: number })[]>('/api/admin/marketing/groepen').then(setGroepen)
    vraag<{ beloningen: Opt[] }>('/api/admin/beloningen').then(d => setBeloningen(d.beloningen))
  }, [params.id])
  if (!c) return <p className="text-ink/50">Laden…</p>
  const zet = (x: Partial<C>) => { setC({ ...c, ...x }); setGewijzigd(true) }
  const opslaan = async () => { await vraag(`/api/admin/marketing/campagnes/${c.id}`, 'PUT', c); setGewijzigd(false); await laad() }
  const actie = async (a: string, extra: object = {}) => {
    try {
      if (gewijzigd) await opslaan()
      const r = await vraag<{ bericht: string }>(`/api/admin/marketing/campagnes/${c.id}/actie`, 'POST', { actie: a, ...extra })
      melding.ok(r.bericht); laad()
    } catch (e) { melding.fout((e as Error).message) }
  }
  const auto = c.type === 'AUTOMATISCH'
  const t = c.trigger || {}

  return (
    <div className="pb-24">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href={`/admin/marketing#${auto ? 'auto' : 'campagnes'}`} className="btn-ghost btn-sm">← Marketing</Link>
        <input className="h-display flex-1 bg-transparent text-2xl outline-none sm:text-3xl" value={c.naam} onChange={e => zet({ naam: e.target.value })} aria-label="Naam" />
        <span className="rounded-full bg-ink/10 px-3 py-1 text-sm font-semibold">{c.status.toLowerCase()}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <Kaart titel="Wie krijgt dit?">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="co">Onderwerp</label><select id="co" className="input" value={c.onderwerpId} onChange={e => zet({ onderwerpId: e.target.value })}>{onderwerpen.map(o => <option key={o.id} value={o.id}>{o.naam}</option>)}</select><p className="mt-1 text-xs text-ink/50">Enkel klanten die dit onderwerp aanvinkten.</p></div>
              <div><label className="label" htmlFor="cg">Klantgroep</label><select id="cg" className="input" value={c.klantgroepId || ''} onChange={e => zet({ klantgroepId: e.target.value || null })}><option value="">Alle klanten</option>{groepen.map(g => <option key={g.id} value={g.id}>{g.naam} ({g.aantal})</option>)}</select><Link href="/admin/marketing#groepen" className="mt-1 inline-block text-xs underline text-ink/50">Klantgroepen beheren</Link></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <label className="flex items-center gap-2"><Switch aan={c.viaMail} onChange={v => zet({ viaMail: v })} label="E-mail" /> ✉️ E-mail</label>
              <label className="flex items-center gap-2"><Switch aan={c.viaPush} onChange={v => zet({ viaPush: v })} label="Push" /> 📱 Pushbericht in de app <span className="text-xs text-ink/50">(zodra de app er is)</span></label>
            </div>
            {!auto && <p className="mt-3 rounded-lg bg-sky-50 p-2.5 text-sm">Op dit moment: <strong>{c.ontvangers} ontvanger{c.ontvangers === 1 ? '' : 's'}</strong>{gewijzigd ? ' (sla op om opnieuw te tellen)' : ''}.</p>}
          </Kaart>

          {auto && (
            <Kaart titel="Wanneer?">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label" htmlFor="ct">Moment</label><select id="ct" className="input" value={t.soort || ''} onChange={e => zet({ trigger: { ...t, soort: e.target.value, dagen: e.target.value === 'INACTIEF' ? (t.dagen || 60) : t.dagen, uren: e.target.value === 'NA_AFHALEN' ? (t.uren || 3) : t.uren } })} disabled={Boolean(c.systeemSleutel)}>{TRIGGERS.map(x => <option key={x.k} value={x.k}>{x.t}</option>)}</select></div>
                {(t.soort === 'INACTIEF' || t.soort === 'NIEUWE_KLANT') && <div><label className="label" htmlFor="cd">Aantal dagen</label><input id="cd" type="number" min={0} className="input" value={t.dagen ?? 0} onChange={e => zet({ trigger: { ...t, dagen: Number(e.target.value) } })} /></div>}
                {t.soort === 'NA_AFHALEN' && <div><label className="label" htmlFor="cu">Aantal uur</label><input id="cu" type="number" min={0} max={72} className="input" value={t.uren ?? 3} onChange={e => zet({ trigger: { ...t, uren: Number(e.target.value) } })} /></div>}
                <div><label className="label" htmlFor="cm">Zelfde klant maximaal om de … dagen</label><input id="cm" type="number" min={0} className="input" value={c.minDagenTussen} onChange={e => zet({ minDagenTussen: Number(e.target.value) })} /></div>
              </div>
              <p className="mt-2 text-sm text-ink/60">{triggerTekst(c.trigger)}. De planner kijkt elke 5 minuten; verjaardagen en herinneringen vertrekken overdag.</p>
            </Kaart>
          )}

          <Kaart titel="Bericht">
            <div className="space-y-3">
              <div><label className="label" htmlFor="cr">Onderwerpregel (mail)</label><input id="cr" className="input" value={c.onderwerpRegel} onChange={e => zet({ onderwerpRegel: e.target.value })} /></div>
              <div><label className="label" htmlFor="cti">Titel</label><input id="cti" className="input" value={c.titel} onChange={e => zet({ titel: e.target.value })} /></div>
              <div><label className="label" htmlFor="cte">Tekst</label><textarea id="cte" className="input min-h-[160px]" value={c.tekst} onChange={e => zet({ tekst: e.target.value })} /><p className="mt-1 text-xs text-ink/50">Een lege regel = nieuwe alinea. Invoegen: {PLACEHOLDERS.map(([p, u]) => <button type="button" key={p} title={u} className="mr-1 rounded bg-sand px-1 font-mono" onClick={() => zet({ tekst: c.tekst + ' ' + p })}>{p}</button>)}</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label" htmlFor="ck">Knoptekst</label><input id="ck" className="input" value={c.knopTekst || ''} onChange={e => zet({ knopTekst: e.target.value })} placeholder="Bv. Bestel nu" /></div>
                <div><label className="label" htmlFor="cu2">Knop gaat naar</label><input id="cu2" className="input" value={c.knopUrl || ''} onChange={e => zet({ knopUrl: e.target.value })} placeholder="{site}/bestellen" /></div>
              </div>
              <div><span className="label">Afbeelding (optioneel)</span><FotoUpload waarde={c.afbeelding} onChange={afbeelding => zet({ afbeelding })} grootte={110} /></div>
              {c.viaPush && <div><label className="label" htmlFor="cp">Tekst pushbericht (kort)</label><input id="cp" className="input" maxLength={180} value={c.pushTekst || ''} onChange={e => zet({ pushTekst: e.target.value })} placeholder={c.titel} /></div>}
              <div><label className="label" htmlFor="cc">Cadeau meesturen (voucher)</label><select id="cc" className="input" value={c.cadeauBeloningId || ''} onChange={e => zet({ cadeauBeloningId: e.target.value || null })}><option value="">Geen cadeau</option>{beloningen.map(b => <option key={b.id} value={b.id}>{b.naam}</option>)}</select><p className="mt-1 text-xs text-ink/50">De klant krijgt een gratis voucher (zonder punten) die aan de kassa gescand wordt. Ideaal voor verjaardagen.</p></div>
            </div>
          </Kaart>

          {!auto && (
            <Kaart titel="Versturen">
              <div className="flex flex-wrap items-end gap-3">
                <button className="btn-brand" onClick={() => setBevestig('nu')} disabled={c.status === 'VERZONDEN'}>Nu versturen ({c.ontvangers})</button>
                <span className="text-sm text-ink/50">of</span>
                <div><label className="label" htmlFor="cpl">Inplannen op</label><input id="cpl" type="datetime-local" className="input" value={plan} onChange={e => setPlan(e.target.value)} /></div>
                <div><label className="label" htmlFor="ch">Herhalen</label><select id="ch" className="input" value={c.herhaling} onChange={e => zet({ herhaling: e.target.value })}><option value="GEEN">Niet</option><option value="WEKELIJKS">Elke week</option><option value="MAANDELIJKS">Elke maand</option></select></div>
                <button className="btn-ink" onClick={() => actie('plan', { geplandOp: plan ? new Date(plan).toISOString() : '' })}>Inplannen</button>
                {c.status === 'GEPLAND' && <button className="btn-ghost" onClick={() => actie('annuleerplanning')}>Planning annuleren</button>}
              </div>
              {c.herhaling !== 'GEEN' && <p className="mt-2 text-sm text-ink/60">Na elke verzending wordt de volgende automatisch ingepland. Pas de tekst gerust aan tussendoor (bv. elke week een ander broodje van de week).</p>}
            </Kaart>
          )}

          <Kaart titel="Verzendlog">
            {!c.log.length ? <p className="text-sm text-ink/50">Nog niets verstuurd.</p> : (
              <table className="w-full text-sm"><tbody className="divide-y divide-ink/5">
                {c.log.map(l => <tr key={l.id}><td className="py-1.5">{l.klant}</td><td>{l.kanaal === 'MAIL' ? '✉️' : '📱'}</td><td className={l.status === 'VERZONDEN' ? 'text-emerald-700' : 'text-ink/50'}>{l.status === 'VERZONDEN' ? 'verzonden' : l.reden || l.status.toLowerCase()}</td><td className="text-right text-ink/50">{new Date(l.verzondenOp).toLocaleString('nl-BE', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td></tr>)}
              </tbody></table>
            )}
          </Kaart>
          {!c.systeemSleutel && <button className="text-sm text-red-600 underline" onClick={() => setBevestig('weg')}>{auto ? 'Automatisatie' : 'Campagne'} verwijderen</button>}
        </div>

        <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <p className="text-sm font-semibold text-ink/60">Voorbeeld</p>
          <Voorbeeld c={c} />
          <div className="flex gap-2"><input className="input text-sm" placeholder="Testmail naar… (leeg = jezelf)" value={testMail} onChange={e => setTestMail(e.target.value)} /><button className="btn-ghost btn-sm shrink-0" onClick={() => actie('test', { email: testMail })}>Testmail</button></div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 backdrop-blur lg:pl-64">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 p-3 sm:px-6 lg:px-8">
          {gewijzigd && <span className="text-sm text-ink/60">Niet-opgeslagen wijzigingen</span>}
          {auto && (c.status === 'ACTIEF'
            ? <button className="btn-ghost" onClick={() => actie('pauzeer')}>⏸ Pauzeren</button>
            : <button className="btn bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => actie('activeer')}>▶ Activeren</button>)}
          <button className="btn-brand px-8" onClick={async () => { try { await opslaan(); melding.ok('Opgeslagen') } catch (e) { melding.fout((e as Error).message) } }}>Opslaan</button>
        </div>
      </div>

      {bevestig === 'nu' && <Bevestig titel="Nu versturen?" knop={`Versturen naar ${c.ontvangers}`} tekst={<>“{c.onderwerpRegel}” gaat nu naar {c.ontvangers} klant{c.ontvangers === 1 ? '' : 'en'}. Dit kan je niet terugdraaien.</>} onNee={() => setBevestig(null)} onJa={async () => { setBevestig(null); await actie('nu') }} />}
      {bevestig === 'weg' && <Bevestig titel="Verwijderen?" gevaarlijk knop="Verwijderen" tekst="De campagne en haar verzendlog worden verwijderd." onNee={() => setBevestig(null)} onJa={async () => { await vraag(`/api/admin/marketing/campagnes/${c.id}`, 'DELETE'); router.push('/admin/marketing') }} />}
      <Melding m={melding.m} />
    </div>
  )
}
