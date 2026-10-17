'use client'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import { Melding, PaginaKop, useMelding } from '@/components/admin/ui'
import FotoKiezer from '@/components/admin/FotoKiezer'

type Veld = { sleutel: string; label: string; groep: string; standaard: string; lang?: boolean; fotos?: number }

export default function Website() {
  const [velden, setVelden] = useState<Veld[]>([])
  const [w, setW] = useState<Record<string, string>>({})
  const [bezig, setBezig] = useState(false)
  const melding = useMelding()
  useEffect(() => { vraag<{ velden: Veld[]; waarden: Record<string, string> }>('/api/admin/inhoud').then(d => { setVelden(d.velden); setW(d.waarden) }) }, [])
  const groepen = Array.from(new Set(velden.map(v => v.groep)))
  return (
    <>
      <PaginaKop titel="Website-teksten & foto’s" sub="Pas de teksten en foto’s op de website aan. Een lege regel maakt een nieuwe alinea.">
        <a href="/" target="_blank" className="btn-ghost">Website bekijken ↗</a>
        <button className="btn-brand" disabled={bezig} onClick={async () => { setBezig(true); try { await vraag('/api/admin/inhoud', 'PUT', w); melding.ok('Opgeslagen — de website is bijgewerkt') } catch (e) { melding.fout((e as Error).message) } finally { setBezig(false) } }}>{bezig ? 'Opslaan…' : 'Opslaan'}</button>
      </PaginaKop>
      <div className="space-y-5">
        {groepen.map(g => (
          <section key={g} className="card p-5">
            <h2 className="mb-4 font-display text-lg font-bold">{g}</h2>
            <div className="space-y-4">
              {velden.filter(v => v.groep === g).map(v => (
                <div key={v.sleutel}>
                  <div className="flex items-center justify-between"><label className="label" htmlFor={v.sleutel}>{v.label}</label>{!v.fotos && w[v.sleutel] !== v.standaard && <button className="text-xs text-ink/50 underline" onClick={() => setW({ ...w, [v.sleutel]: v.standaard })}>standaardtekst</button>}</div>
                  {v.fotos ? <FotoKiezer max={v.fotos} waarde={w[v.sleutel] || ''} onChange={x => setW({ ...w, [v.sleutel]: x })} /> : v.lang ? <textarea id={v.sleutel} className="input min-h-[110px]" value={w[v.sleutel] || ''} onChange={e => setW({ ...w, [v.sleutel]: e.target.value })} /> : <input id={v.sleutel} className="input" value={w[v.sleutel] || ''} onChange={e => setW({ ...w, [v.sleutel]: e.target.value })} />}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <Melding m={melding.m} />
    </>
  )
}
