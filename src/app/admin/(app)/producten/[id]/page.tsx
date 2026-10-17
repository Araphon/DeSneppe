'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import { Bevestig } from '@/components/Modal'
import FotoUpload from '@/components/admin/FotoUpload'
import UitverkochtModal from '@/components/admin/UitverkochtModal'
import { CentInput, Kaart, Melding, Switch, useMelding } from '@/components/admin/ui'
import { exclVanIncl, inclVanExcl, parseBedrag } from '@/lib/geld'

type Aanpassing = { id?: string; naam: string; prijsCent: number; actief: boolean }
type AL = { allergeenId: string; soort: 'BEVAT' | 'SPOREN' }
type Allergeen = { id: string; naam: string; icoon: string | null; wettelijk: boolean }
type Keuze = { id?: string; naam: string; prijsCent: number; allergenen: string | null; standaard: boolean; actief: boolean; allergenenLijst: AL[] }
type Optie = { id?: string; naam: string; verplicht: boolean; wijzigtAllergenen: boolean; keuzes: Keuze[] }
type Product = {
  naam: string; omschrijving: string | null; afbeelding: string | null; prijsExcl: number; btwPct: number; categorieId: string
  zichtbaar: boolean; volgorde: number; aanpassingenActief: boolean; aanpassingenTitel: string; aanpassingen: Aanpassing[]; opties: Optie[]
  allergenenActief: boolean; allergenen: string | null; loyaltyActief: boolean; loyaltyPunten: number; stickerPrinten: boolean
  maxPerBestelling: number | null; leeftijdsgrens: number | null; labelIds: string[]; uitverkocht?: boolean; uitverkochtTot?: string | null
  allergenenLijst: AL[]
  beschikbaarDagen: number[]; beschikbaarVan: string | null; beschikbaarTot: string | null; seizoenVan: string | null; seizoenTot: string | null
}
type Cat = { id: string; naam: string }
type Label = { id: string; naam: string; afbeelding: string | null; kleur: string }

const LEEG: Product = {
  naam: '', omschrijving: '', afbeelding: null, prijsExcl: 0, btwPct: 6, categorieId: '', zichtbaar: true, volgorde: 0,
  aanpassingenActief: false, aanpassingenTitel: 'Aanpassingen', aanpassingen: [], opties: [], allergenenActief: false, allergenen: '',
  loyaltyActief: false, loyaltyPunten: 0, stickerPrinten: false, maxPerBestelling: null, leeftijdsgrens: null, labelIds: [],
  allergenenLijst: [],
  beschikbaarDagen: [], beschikbaarVan: null, beschikbaarTot: null, seizoenVan: null, seizoenTot: null,
}
const BTW = [6, 12, 21, 0]
const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

// Allergenen kiezen: tik rond tussen geen → bevat → sporen
function AllergeenKiezer({ lijst, alle, onChange, metSporen = true, onNieuw }: { lijst: AL[]; alle: Allergeen[]; onChange: (l: AL[]) => void; metSporen?: boolean; onNieuw?: (a: Allergeen) => void }) {
  const [nieuw, setNieuw] = useState('')
  const soort = (id: string) => lijst.find(x => x.allergeenId === id)?.soort
  const volgende = (id: string) => {
    const s = soort(id)
    const rest = lijst.filter(x => x.allergeenId !== id)
    if (!s) onChange([...rest, { allergeenId: id, soort: 'BEVAT' }])
    else if (s === 'BEVAT' && metSporen) onChange([...rest, { allergeenId: id, soort: 'SPOREN' }])
    else onChange(rest)
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {alle.map(a => {
          const s = soort(a.id)
          return (
            <button key={a.id} type="button" onClick={() => volgende(a.id)} title={s === 'BEVAT' ? 'Bevat' : s === 'SPOREN' ? 'Kan sporen bevatten' : 'Niet aanwezig'}
              className={`rounded-md border px-2 py-1 text-sm ${s === 'BEVAT' ? 'border-red-600 bg-red-600 font-semibold text-white' : s === 'SPOREN' ? 'border-mustard bg-mustard/30 font-medium' : 'border-ink/15 bg-white text-ink/60'}`}>
              {a.icoon} {a.naam}{s === 'SPOREN' ? ' (sporen)' : ''}
            </button>
          )
        })}
        {onNieuw && (
          <form className="inline-flex gap-1" onSubmit={async e => {
            e.preventDefault(); if (!nieuw.trim()) return
            try { const a = await vraag<Allergeen>('/api/admin/allergenen', 'POST', { naam: nieuw }); onNieuw(a); setNieuw('') } catch (err) { alertFout((err as Error).message) }
          }}>
            <input className="input w-36 py-1 text-sm" placeholder="+ ander allergeen" value={nieuw} onChange={e => setNieuw(e.target.value)} />
            {nieuw && <button className="btn-ghost btn-sm">Toevoegen</button>}
          </form>
        )}
      </div>
    </div>
  )
}
let alertFout: (t: string) => void = () => {}

function MaandDag({ waarde, onChange, id }: { waarde: string; onChange: (v: string) => void; id: string }) {
  const [m, d] = (waarde || '01-01').split('-')
  return (
    <div className="flex gap-1">
      <select id={id} className="input w-auto" value={Number(d)} onChange={e => onChange(`${m}-${String(e.target.value).padStart(2, '0')}`)}>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
      <select className="input w-auto" value={Number(m)} onChange={e => onChange(`${String(e.target.value).padStart(2, '0')}-${d}`)} aria-label="Maand">{MAANDEN.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
    </div>
  )
}
const fmt = (n: number, dec = 2) => (Math.round(n * 10 ** dec) / 10 ** dec).toFixed(dec).replace('.', ',')
const fmtExcl = (n: number) => { const t = fmt(n, 4); return t.replace(/(,\d\d)0{1,2}$/, '$1') }

export default function ProductBewerken({ params }: { params: { id: string } }) {
  const nieuw = params.id === 'nieuw'
  const router = useRouter()
  const melding = useMelding()
  const [p, setP] = useState<Product | null>(nieuw ? LEEG : null)
  const [cats, setCats] = useState<Cat[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [allergenenAlle, setAllergenenAlle] = useState<Allergeen[]>([])
  alertFout = melding.fout
  const [exclT, setExclT] = useState('')
  const [inclT, setInclT] = useState('')
  const [laatst, setLaatst] = useState<'excl' | 'incl'>('incl')
  const [bezig, setBezig] = useState(false)
  const [verwijder, setVerwijder] = useState(false)
  const [uitModal, setUitModal] = useState(false)
  const [gewijzigd, setGewijzigd] = useState(false)

  useEffect(() => {
    vraag<Cat[]>('/api/admin/categorieen').then(c => { setCats(c); if (nieuw) setP(x => x && !x.categorieId ? { ...x, categorieId: c[0]?.id || '' } : x) })
    vraag<Label[]>('/api/admin/labels').then(setLabels)
    vraag<Allergeen[]>('/api/admin/allergenen').then(setAllergenenAlle)
    if (!nieuw) vraag<Product>(`/api/admin/producten/${params.id}`).then(d => {
      setP(d); setExclT(fmtExcl(d.prijsExcl)); setInclT(fmt(inclVanExcl(d.prijsExcl, d.btwPct)))
    })
  }, [params.id, nieuw])

  useEffect(() => {
    const w = (e: BeforeUnloadEvent) => { if (gewijzigd) e.preventDefault() }
    window.addEventListener('beforeunload', w); return () => window.removeEventListener('beforeunload', w)
  }, [gewijzigd])

  if (!p) return <p className="text-ink/50">Laden…</p>
  const zet = (patch: Partial<Product>) => { setP({ ...p, ...patch }); setGewijzigd(true) }

  function opExcl(t: string) {
    setExclT(t); setLaatst('excl')
    const n = parseBedrag(t)
    if (n !== null) { setInclT(fmt(inclVanExcl(n, p!.btwPct))); zet({ prijsExcl: n }) }
  }
  function opIncl(t: string) {
    setInclT(t); setLaatst('incl')
    const n = parseBedrag(t)
    if (n !== null) { const e = exclVanIncl(n, p!.btwPct); setExclT(fmtExcl(e)); zet({ prijsExcl: e }) }
  }
  function opBtw(b: number) {
    if (laatst === 'incl') {
      const n = parseBedrag(inclT)
      if (n !== null) { const e = exclVanIncl(n, b); setExclT(fmtExcl(e)); zet({ btwPct: b, prijsExcl: e }); return }
    } else {
      const n = parseBedrag(exclT)
      if (n !== null) setInclT(fmt(inclVanExcl(n, b)))
    }
    zet({ btwPct: b })
  }

  const zetAanp = (i: number, patch: Partial<Aanpassing>) => zet({ aanpassingen: p.aanpassingen.map((a, j) => j === i ? { ...a, ...patch } : a) })
  const zetOptie = (i: number, patch: Partial<Optie>) => zet({ opties: p.opties.map((o, j) => j === i ? { ...o, ...patch } : o) })
  const zetKeuze = (oi: number, ki: number, patch: Partial<Keuze>) => zetOptie(oi, { keuzes: p.opties[oi].keuzes.map((k, j) => j === ki ? { ...k, ...patch } : patch.standaard ? { ...k, standaard: false } : k) })
  const verplaats = <T,>(lijst: T[], i: number, d: number) => { const n = [...lijst]; const j = i + d; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n }

  async function opslaan() {
    if (!p) return
    if (!p.naam.trim()) return melding.fout('Vul een naam in.')
    if (parseBedrag(inclT) === null) return melding.fout('Vul een prijs in.')
    setBezig(true)
    try {
      const data = {
        ...p,
        aanpassingen: p.aanpassingen.filter(a => a.naam.trim()),
        opties: p.opties.map(o => ({ ...o, keuzes: o.keuzes.filter(k => k.naam.trim()) })).filter(o => o.naam.trim() || o.keuzes.length),
      }
      if (nieuw) {
        const r = await vraag<{ id: string }>('/api/admin/producten', 'POST', data)
        setGewijzigd(false); melding.ok('Product aangemaakt')
        router.replace(`/admin/producten/${r.id}`)
      } else {
        await vraag(`/api/admin/producten/${params.id}`, 'PUT', data)
        const d = await vraag<Product>(`/api/admin/producten/${params.id}`)
        setP(d); setGewijzigd(false); melding.ok('Opgeslagen')
      }
    } catch (e) { melding.fout((e as Error).message) } finally { setBezig(false) }
  }

  const uitverkochtTekst = p.uitverkocht
    ? p.uitverkochtTot ? `Uitverkocht t.e.m. ${new Intl.DateTimeFormat('nl-BE', { timeZone: 'Europe/Brussels', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(new Date(p.uitverkochtTot).getTime() - 60000))}` : 'Uitverkocht tot je het terug aanzet'
    : 'Beschikbaar'

  return (
    <div className="pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/producten" className="btn-ghost btn-sm">← Producten</Link>
        <h1 className="h-display flex-1 truncate text-2xl sm:text-3xl">{nieuw ? 'Nieuw product' : p.naam || 'Product'}</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Kaart titel="Product">
            <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
              <FotoUpload waarde={p.afbeelding} onChange={afbeelding => zet({ afbeelding })} />
              <div className="space-y-3">
                <div><label className="label" htmlFor="naam">Naam</label><input id="naam" className="input" value={p.naam} onChange={e => zet({ naam: e.target.value })} placeholder="Bv. Martino" /></div>
                <div><label className="label" htmlFor="cat">Categorie</label>
                  <select id="cat" className="input" value={p.categorieId} onChange={e => zet({ categorieId: e.target.value })}>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.naam}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-3"><label className="label" htmlFor="oms">Omschrijving</label><textarea id="oms" className="input min-h-[80px]" value={p.omschrijving || ''} onChange={e => zet({ omschrijving: e.target.value })} placeholder="Bv. Preparé, ansjovis, tomaat, augurk, martinosaus" /></div>
          </Kaart>

          <Kaart titel="Prijs" uitleg="Vul de prijs excl. óf incl. btw in — het andere veld wordt automatisch berekend.">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="label" htmlFor="excl">Prijs excl. btw</label>
                <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">€</span><input id="excl" className="input pl-7 text-right" inputMode="decimal" value={exclT} onChange={e => opExcl(e.target.value)} placeholder="0,00" /></div>
              </div>
              <div><label className="label" htmlFor="btw">Btw-tarief</label>
                <select id="btw" className="input" value={p.btwPct} onChange={e => opBtw(Number(e.target.value))}>
                  {BTW.concat(BTW.includes(p.btwPct) ? [] : [p.btwPct]).map(b => <option key={b} value={b}>{b}%{b === 6 ? ' (take-away)' : ''}</option>)}
                </select>
              </div>
              <div><label className="label" htmlFor="incl">Prijs incl. btw</label>
                <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">€</span><input id="incl" className="input pl-7 text-right font-semibold" inputMode="decimal" value={inclT} onChange={e => opIncl(e.target.value)} placeholder="0,00" /></div>
              </div>
            </div>
          </Kaart>

          <Kaart titel="Aanpassingen" uitleg="Vinkjes die de klant kan aanduiden, bv. “Zonder augurk” of “Met ei (+ € 0,30)”."
            toggle={{ aan: p.aanpassingenActief, onChange: v => zet({ aanpassingenActief: v, aanpassingen: v && !p.aanpassingen.length ? [{ naam: '', prijsCent: 0, actief: true }] : p.aanpassingen }), label: 'Aanpassingen mogelijk voor product?' }}>
            <div className="mb-3 max-w-xs"><label className="label" htmlFor="at">Titel boven de lijst</label><input id="at" className="input" value={p.aanpassingenTitel} onChange={e => zet({ aanpassingenTitel: e.target.value })} /></div>
            <div className="space-y-2">
              <div className="hidden grid-cols-[1fr_130px_auto] gap-2 px-1 text-xs font-medium text-ink/50 sm:grid"><span>Aanpassing</span><span className="text-right">Prijsimpact (incl.)</span><span className="w-[124px]" /></div>
              {p.aanpassingen.map((a, i) => (
                <div key={a.id || `n${i}`} className={`grid grid-cols-[1fr_110px] gap-2 rounded-xl sm:grid-cols-[1fr_130px_auto] ${!a.actief ? 'opacity-50' : ''}`}>
                  <input className="input" value={a.naam} onChange={e => zetAanp(i, { naam: e.target.value })} placeholder="Bv. Zonder augurk" aria-label="Naam aanpassing" />
                  <CentInput cent={a.prijsCent} onChange={c => zetAanp(i, { prijsCent: c })} />
                  <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1">
                    <button type="button" className="rounded-lg px-2 py-2 hover:bg-sand" onClick={() => zet({ aanpassingen: verplaats(p.aanpassingen, i, -1) })} aria-label="Omhoog">↑</button>
                    <button type="button" className="rounded-lg px-2 py-2 hover:bg-sand" onClick={() => zet({ aanpassingen: verplaats(p.aanpassingen, i, 1) })} aria-label="Omlaag">↓</button>
                    <Switch aan={a.actief} onChange={v => zetAanp(i, { actief: v })} label="Actief" />
                    <button type="button" className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50" onClick={() => zet({ aanpassingen: p.aanpassingen.filter((_, j) => j !== i) })} aria-label="Verwijderen">🗑</button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn-ghost btn-sm" onClick={() => zet({ aanpassingen: [...p.aanpassingen, { naam: '', prijsCent: 0, actief: true }] })}>+ Aanpassing toevoegen</button>
              <p className="text-xs text-ink/50">Tip: een negatieve prijs (bv. −0,30) verlaagt de prijs, bv. bij “Zonder groenten”.</p>
            </div>
          </Kaart>

          <Kaart titel="Opties" uitleg="Een keuzevraag met één antwoord, bv. “Welk broodje?” → wit / bruin / meergranen."
            actie={<button type="button" className="btn-ghost btn-sm" onClick={() => zet({ opties: [...p.opties, { naam: '', verplicht: true, wijzigtAllergenen: false, keuzes: [{ naam: '', prijsCent: 0, allergenen: '', standaard: true, actief: true, allergenenLijst: [] }, { naam: '', prijsCent: 0, allergenen: '', standaard: false, actief: true, allergenenLijst: [] }] }] })}>+ Optie</button>}>
            {!p.opties.length && <p className="text-sm text-ink/50">Nog geen opties.</p>}
            <div className="space-y-4">
              {p.opties.map((o, oi) => (
                <div key={o.id || `o${oi}`} className="rounded-2xl border border-ink/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input className="input flex-1 font-semibold" value={o.naam} onChange={e => zetOptie(oi, { naam: e.target.value })} placeholder="Vraag, bv. Welk broodje?" aria-label="Vraag" />
                    <button type="button" className="rounded-lg px-2 py-2 hover:bg-sand" onClick={() => zet({ opties: verplaats(p.opties, oi, -1) })} aria-label="Optie omhoog">↑</button>
                    <button type="button" className="rounded-lg px-2 py-2 hover:bg-sand" onClick={() => zet({ opties: verplaats(p.opties, oi, 1) })} aria-label="Optie omlaag">↓</button>
                    <button type="button" className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50" onClick={() => zet({ opties: p.opties.filter((_, j) => j !== oi) })} aria-label="Optie verwijderen">🗑</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand" checked={o.verplicht} onChange={e => zetOptie(oi, { verplicht: e.target.checked })} />Verplicht te kiezen</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand" checked={o.wijzigtAllergenen} onChange={e => zetOptie(oi, { wijzigtAllergenen: e.target.checked })} />Wijzigt ook de allergenenlijst</label>
                  </div>
                  <div className="mt-3 space-y-2">
                    {o.keuzes.map((k, ki) => (
                      <div key={k.id || `k${ki}`} className="rounded-xl bg-cream p-2">
                        <div className="grid grid-cols-[auto_1fr_110px_auto] items-center gap-2">
                          <input type="radio" name={`std-${oi}`} title="Standaard geselecteerd" checked={k.standaard} onChange={() => zetKeuze(oi, ki, { standaard: true })} className="h-4 w-4 accent-brand" aria-label="Standaard" />
                          <input className="input" value={k.naam} onChange={e => zetKeuze(oi, ki, { naam: e.target.value })} placeholder="Bv. Wit broodje" aria-label="Keuze" />
                          <CentInput cent={k.prijsCent} onChange={c => zetKeuze(oi, ki, { prijsCent: c })} />
                          <button type="button" className="rounded-lg px-2 py-2 text-red-600 hover:bg-red-50" onClick={() => zetOptie(oi, { keuzes: o.keuzes.filter((_, j) => j !== ki) })} aria-label="Keuze verwijderen">🗑</button>
                        </div>
                        {o.wijzigtAllergenen && (
                          <div className="mt-2">
                            <p className="mb-1 text-xs text-ink/60">Extra allergenen bij “{k.naam || 'deze keuze'}”:</p>
                            <AllergeenKiezer lijst={k.allergenenLijst || []} alle={allergenenAlle} onChange={l => zetKeuze(oi, ki, { allergenenLijst: l })} />
                          </div>
                        )}
                      </div>
                    ))}
                    <button type="button" className="text-sm font-semibold text-brand-dark" onClick={() => zetOptie(oi, { keuzes: [...o.keuzes, { naam: '', prijsCent: 0, allergenen: '', standaard: false, actief: true, allergenenLijst: [] }] })}>+ Keuze toevoegen</button>
                  </div>
                  <p className="mt-2 text-xs text-ink/50">Het bolletje links duidt de standaardkeuze aan.{o.wijzigtAllergenen && ' De allergenen van de gekozen keuze komen bij die van het product.'}</p>
                </div>
              ))}
            </div>
          </Kaart>

          <Kaart titel="Allergenen" uitleg="Tik om te wisselen: niet aanwezig → bevat (rood) → kan sporen bevatten (geel)." toggle={{ aan: p.allergenenActief, onChange: v => zet({ allergenenActief: v }), label: 'Allergenen ingevuld' }}>
            <AllergeenKiezer lijst={p.allergenenLijst} alle={allergenenAlle} onChange={l => zet({ allergenenLijst: l })} onNieuw={a => setAllergenenAlle(x => [...x, a])} />
            <label className="label mt-4" htmlFor="alo">Extra info (optioneel)</label>
            <textarea id="alo" className="input min-h-[60px]" value={p.allergenen || ''} onChange={e => zet({ allergenen: e.target.value })} placeholder="Bv. Gluten uit tarwe. Noten: walnoot." />
            <p className="mt-2 text-xs text-ink/50">Staat dit aan zonder dat er iets aangeduid is, dan toont de shop “bevat geen van de 14 wettelijke allergenen”.</p>
          </Kaart>
        </div>

        <div className="space-y-5">
          <Kaart titel="Zichtbaarheid">
            <label className="flex items-center justify-between gap-3"><span><span className="block font-medium">Tonen in de shop</span><span className="text-sm text-ink/60">Uit = volledig verborgen</span></span><Switch aan={p.zichtbaar} onChange={v => zet({ zichtbaar: v })} label="Zichtbaar" /></label>
            {!nieuw && (
              <div className="mt-4 border-t border-ink/10 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span><span className="block font-medium">Beschikbaar</span><span className={`text-sm ${p.uitverkocht ? 'text-brand-dark' : 'text-ink/60'}`}>{uitverkochtTekst}</span></span>
                  <Switch aan={!p.uitverkocht} label="Beschikbaar" onChange={async aan => {
                    if (!aan) return setUitModal(true)
                    await vraag(`/api/admin/producten/${params.id}/uitverkocht`, 'PUT', { modus: 'terug' }); setP({ ...p, uitverkocht: false, uitverkochtTot: null }); melding.ok('Terug beschikbaar')
                  }} />
                </div>
              </div>
            )}
            <div className="mt-4 border-t border-ink/10 pt-4">
              <label className="label" htmlFor="max">Max. aantal per bestelling</label>
              <input id="max" type="number" min={1} className="input" value={p.maxPerBestelling ?? ''} onChange={e => zet({ maxPerBestelling: e.target.value ? Number(e.target.value) : null })} placeholder="Onbeperkt" />
            </div>
            <div className="mt-3">
              <label className="label" htmlFor="lg">Leeftijdsgrens (alcohol)</label>
              <select id="lg" className="input" value={p.leeftijdsgrens ?? ''} onChange={e => zet({ leeftijdsgrens: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Geen</option><option value={16}>16+ (bier, wijn)</option><option value={18}>18+ (sterke drank)</option>
              </select>
            </div>
            <div className="mt-3">
              <label className="label" htmlFor="volg">Volgorde in categorie</label>
              <input id="volg" type="number" className="input" value={p.volgorde} onChange={e => zet({ volgorde: Number(e.target.value) })} />
            </div>
          </Kaart>

          <Kaart titel="Beschikbaarheid" uitleg="Wanneer kan dit product afgehaald worden?">
            <span className="label">Dagen</span>
            <div className="flex flex-wrap gap-1.5">
              {DAGEN.map((d, i) => {
                const aan = p.beschikbaarDagen.length === 0 || p.beschikbaarDagen.includes(i + 1)
                return <button key={d} type="button" onClick={() => {
                  const huidig = p.beschikbaarDagen.length ? p.beschikbaarDagen : [1, 2, 3, 4, 5, 6, 7]
                  const n = aan ? huidig.filter(x => x !== i + 1) : [...huidig, i + 1].sort()
                  zet({ beschikbaarDagen: n.length === 7 ? [] : n })
                }} className={`h-9 w-9 rounded-lg text-sm font-semibold ${aan ? 'bg-ink text-white' : 'border border-ink/15 bg-white text-ink/40'}`}>{d}</button>
              })}
            </div>
            <p className="mt-1 text-xs text-ink/50">{p.beschikbaarDagen.length === 0 ? 'Elke dag dat de zaak open is.' : 'Enkel op de zwarte dagen.'}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div><label className="label" htmlFor="bv">Afhalen vanaf</label><input id="bv" type="time" className="input" value={p.beschikbaarVan || ''} onChange={e => zet({ beschikbaarVan: e.target.value || null })} /></div>
              <div><label className="label" htmlFor="bt">tot</label><input id="bt" type="time" className="input" value={p.beschikbaarTot || ''} onChange={e => zet({ beschikbaarTot: e.target.value || null })} /></div>
            </div>
            <p className="mt-1 text-xs text-ink/50">Leeg = de hele openingstijd. Bv. ontbijt: tot 10:00.</p>
            <label className="mt-4 flex items-center justify-between gap-3"><span className="font-medium">Seizoensproduct</span><Switch aan={Boolean(p.seizoenVan)} onChange={v => zet(v ? { seizoenVan: '10-01', seizoenTot: '03-31' } : { seizoenVan: null, seizoenTot: null })} label="Seizoensproduct" /></label>
            {p.seizoenVan && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 text-sm"><span className="w-10">van</span><MaandDag id="sv" waarde={p.seizoenVan} onChange={v => zet({ seizoenVan: v })} /></div>
                <div className="flex items-center gap-2 text-sm"><span className="w-10">t.e.m.</span><MaandDag id="st" waarde={p.seizoenTot || '03-31'} onChange={v => zet({ seizoenTot: v })} /></div>
                <p className="text-xs text-ink/50">Elk jaar opnieuw. Buiten het seizoen verdwijnt het product uit de shop.</p>
              </div>
            )}
          </Kaart>

          <Kaart titel="Labels" uitleg="Verschijnen achter de titel in de shop.">
            <div className="flex flex-wrap gap-2">
              {labels.map(l => {
                const aan = p.labelIds.includes(l.id)
                return (
                  <button key={l.id} type="button" onClick={() => zet({ labelIds: aan ? p.labelIds.filter(x => x !== l.id) : [...p.labelIds, l.id] })}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${aan ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white'}`}>
                    {l.afbeelding && <Image src={l.afbeelding} alt="" width={18} height={18} className="h-[18px] w-[18px]" />}{l.naam}
                  </button>
                )
              })}
              <Link href="/admin/labels" className="px-2 py-1.5 text-sm text-ink/50 underline">Labels beheren</Link>
            </div>
          </Kaart>

          <Kaart titel="Loyaltyprogramma" toggle={{ aan: p.loyaltyActief, onChange: v => zet({ loyaltyActief: v, loyaltyPunten: v && !p.loyaltyPunten ? 10 : p.loyaltyPunten }), label: 'Punten sparen' }}>
            <label className="label" htmlFor="pt">Punten per stuk</label>
            <input id="pt" type="number" min={0} className="input" value={p.loyaltyPunten} onChange={e => zet({ loyaltyPunten: Number(e.target.value) })} />
          </Kaart>

          <Kaart titel="Ticket">
            <label className="flex items-center justify-between gap-3"><span><span className="block font-medium">Sticker printen bij bestelling</span><span className="text-sm text-ink/60">Per stuk een sticker met klantnaam en aanpassingen</span></span><Switch aan={p.stickerPrinten} onChange={v => zet({ stickerPrinten: v })} label="Sticker printen" /></label>
          </Kaart>

          {!nieuw && <button type="button" className="w-full text-sm text-red-600 underline" onClick={() => setVerwijder(true)}>Product verwijderen</button>}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 backdrop-blur lg:pl-64">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 p-3 sm:px-6 lg:px-8">
          {gewijzigd && <span className="text-sm text-ink/60">Niet-opgeslagen wijzigingen</span>}
          <button className="btn-brand px-8" disabled={bezig} onClick={opslaan}>{bezig ? 'Opslaan…' : 'Opslaan'}</button>
        </div>
      </div>

      {verwijder && <Bevestig titel="Product verwijderen?" gevaarlijk knop="Verwijderen" tekst={<>“{p.naam}” wordt definitief verwijderd. Bestaande bestellingen blijven bewaard. Tip: je kan het product ook gewoon verbergen.</>}
        onNee={() => setVerwijder(false)} onJa={async () => { await vraag(`/api/admin/producten/${params.id}`, 'DELETE'); setGewijzigd(false); router.push('/admin/producten') }} />}
      {uitModal && <UitverkochtModal naam={p.naam} onSluit={() => setUitModal(false)} onKies={async (modus, tot) => {
        const r = await vraag<{ uitverkocht: boolean; uitverkochtTot: string | null }>(`/api/admin/producten/${params.id}/uitverkocht`, 'PUT', { modus, tot })
        setP({ ...p, ...r }); setUitModal(false); melding.ok('Op uitverkocht gezet')
      }} />}
      <Melding m={melding.m} />
    </div>
  )
}
