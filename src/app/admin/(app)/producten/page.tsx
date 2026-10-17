'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { vraag } from '@/components/fetcher'
import { Melding, PaginaKop, Switch, useMelding } from '@/components/admin/ui'
import UitverkochtModal, { type UitverkochtModus } from '@/components/admin/UitverkochtModal'
import { euro } from '@/lib/geld'

type Rij = { id: string; naam: string; afbeelding: string | null; categorieId: string; categorie: string; prijsCent: number; btwPct: number; zichtbaar: boolean; uitverkocht: boolean; uitverkochtTot: string | null; stickerPrinten: boolean; loyaltyPunten: number; labels: { naam: string; afbeelding: string | null; kleur: string }[]; aantalAanpassingen: number; aantalOpties: number }

function totTekst(iso: string | null) {
  if (!iso) return 'tot manueel terug aan'
  const d = new Date(new Date(iso).getTime() - 60000)
  return 't.e.m. ' + new Intl.DateTimeFormat('nl-BE', { timeZone: 'Europe/Brussels', weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

export default function Producten() {
  const [rijen, setRijen] = useState<Rij[] | null>(null)
  const [zoek, setZoek] = useState('')
  const [cat, setCat] = useState('')
  const [filter, setFilter] = useState<'' | 'uitverkocht' | 'verborgen'>('')
  const [uit, setUit] = useState<Rij | null>(null)
  const melding = useMelding()
  const laad = () => vraag<Rij[]>('/api/admin/producten').then(setRijen)
  useEffect(() => { laad() }, [])

  const cats = useMemo(() => Array.from(new Map((rijen || []).map(r => [r.categorieId, r.categorie])).entries()), [rijen])
  const zicht = (rijen || []).filter(r =>
    (!cat || r.categorieId === cat) &&
    (!filter || (filter === 'uitverkocht' ? r.uitverkocht : !r.zichtbaar)) &&
    (!zoek || r.naam.toLowerCase().includes(zoek.toLowerCase())))

  async function zetUitverkocht(r: Rij, modus: UitverkochtModus | 'terug', tot?: string) {
    try {
      await vraag(`/api/admin/producten/${r.id}/uitverkocht`, 'PUT', { modus, tot })
      melding.ok(modus === 'terug' ? `${r.naam} is terug beschikbaar` : `${r.naam} staat op uitverkocht`)
      setUit(null); laad()
    } catch (e) { melding.fout((e as Error).message) }
  }

  return (
    <>
      <PaginaKop titel="Producten" sub={rijen ? `${rijen.length} producten · ${rijen.filter(r => r.uitverkocht).length} uitverkocht` : undefined}>
        <Link href="/admin/producten/nieuw" className="btn-brand">+ Nieuw product</Link>
      </PaginaKop>
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Zoeken…" value={zoek} onChange={e => setZoek(e.target.value)} />
        <select className="input w-auto" value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">Alle categorieën</option>
          {cats.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <select className="input w-auto" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
          <option value="">Alle</option><option value="uitverkocht">Enkel uitverkocht</option><option value="verborgen">Enkel verborgen</option>
        </select>
      </div>
      {!rijen ? <p className="text-ink/50">Laden…</p> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sand/60 text-left text-xs uppercase tracking-wide text-ink/60">
              <tr><th className="p-3">Product</th><th className="hidden p-3 md:table-cell">Categorie</th><th className="p-3 text-right">Prijs</th><th className="hidden p-3 lg:table-cell">Extra</th><th className="p-3 text-center">Beschikbaar</th></tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {zicht.map(r => (
                <tr key={r.id} className={`hover:bg-cream ${!r.zichtbaar ? 'opacity-50' : ''}`}>
                  <td className="p-3">
                    <Link href={`/admin/producten/${r.id}`} className="flex items-center gap-3">
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-sand">{r.afbeelding && <Image src={r.afbeelding} alt="" fill sizes="44px" className={`object-cover ${r.uitverkocht ? 'grayscale' : ''}`} />}</span>
                      <span>
                        <span className="font-semibold hover:underline">{r.naam}</span>
                        {r.labels.map(l => l.afbeelding ? <Image key={l.naam} src={l.afbeelding} alt={l.naam} width={16} height={16} className="ml-1 inline-block h-4 w-4" /> : null)}
                        {!r.zichtbaar && <span className="ml-2 rounded bg-ink/10 px-1.5 text-xs">verborgen</span>}
                        {r.uitverkocht && <span className="block text-xs font-medium text-brand-dark">Uitverkocht {totTekst(r.uitverkochtTot)}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="hidden p-3 text-ink/70 md:table-cell">{r.categorie}</td>
                  <td className="p-3 text-right font-medium">{euro(r.prijsCent)}<span className="block text-xs font-normal text-ink/50">{r.btwPct}% btw</span></td>
                  <td className="hidden p-3 text-xs text-ink/60 lg:table-cell">
                    {r.aantalOpties > 0 && <span className="mr-2">🔘 {r.aantalOpties} optie{r.aantalOpties > 1 ? 's' : ''}</span>}
                    {r.aantalAanpassingen > 0 && <span className="mr-2">✏️ {r.aantalAanpassingen}</span>}
                    {r.stickerPrinten && <span className="mr-2" title="Sticker printen">🏷️</span>}
                    {r.loyaltyPunten > 0 && <span title="Loyaltypunten">⭐ {r.loyaltyPunten}</span>}
                  </td>
                  <td className="p-3 text-center">
                    <Switch aan={!r.uitverkocht} label={`${r.naam} beschikbaar`} onChange={aan => aan ? zetUitverkocht(r, 'terug') : setUit(r)} />
                  </td>
                </tr>
              ))}
              {!zicht.length && <tr><td colSpan={5} className="p-8 text-center text-ink/50">Geen producten gevonden.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {uit && <UitverkochtModal naam={uit.naam} onSluit={() => setUit(null)} onKies={(m, t) => zetUitverkocht(uit, m, t)} />}
      <Melding m={melding.m} />
    </>
  )
}
