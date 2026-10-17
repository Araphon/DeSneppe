'use client'
// Lichte SVG-grafieken voor het rapportage-dashboard (geen externe bibliotheek).
// Palet: gevalideerd referentiepalet (blauw = huidige periode, gedempt grijs = vergelijking).
import { useRef, useState } from 'react'

export const KLEUR = {
  reeks: '#2a78d6',
  reeksZacht: 'rgba(42,120,214,0.12)',
  vergelijk: '#8f8a80',
  grid: 'rgba(20,20,20,0.08)',
  as: 'rgba(20,20,20,0.45)',
  tekst: '#141414',
  tekst2: '#52514e',
  // sequentiële blauwe schaal (licht → donker) voor de heatmap
  schaal: ['#f3f2ef', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
}

function mooieMax(v: number) {
  if (v <= 0) return 1
  const e = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / e
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e
}

type Punt = { label: string; tooltipLabel: string; waarde: number; vorig: number | null }

export function Lijngrafiek({ punten, formaat, legende }: { punten: Punt[]; formaat: (v: number) => string; legende: { huidig: string; vorig?: string } }) {
  const B = 720, H = 260, L = 56, R = 16, T = 16, O = 32
  const [hover, setHover] = useState<number | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const max = mooieMax(Math.max(1, ...punten.map(p => Math.max(p.waarde, p.vorig ?? 0))))
  const x = (i: number) => L + (punten.length <= 1 ? (B - L - R) / 2 : (i * (B - L - R)) / (punten.length - 1))
  const y = (v: number) => T + (H - T - O) * (1 - v / max)
  const pad = (k: 'waarde' | 'vorig') => punten.map((p, i) => (p[k] === null ? null : `${x(i)},${y(p[k] as number)}`)).filter(Boolean).join(' L ')
  const heeftVorig = punten.some(p => p.vorig !== null)
  const stap = Math.max(1, Math.ceil(punten.length / 8))
  const h = hover !== null ? punten[hover] : null

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-ink/70">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded" style={{ background: KLEUR.reeks }} />{legende.huidig}</span>
        {heeftVorig && legende.vorig && <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed" style={{ borderColor: KLEUR.vergelijk }} />{legende.vorig}</span>}
      </div>
      <svg ref={svg} viewBox={`0 0 ${B} ${H}`} className="w-full" role="img" aria-label={`Lijngrafiek ${legende.huidig}`}
        onMouseMove={e => {
          const r = svg.current!.getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * B
          let best = 0, d = Infinity
          punten.forEach((_, i) => { const dd = Math.abs(x(i) - px); if (dd < d) { d = dd; best = i } })
          setHover(best)
        }} onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <g key={f}>
            <line x1={L} x2={B - R} y1={y(max * f)} y2={y(max * f)} stroke={KLEUR.grid} />
            <text x={L - 8} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill={KLEUR.tekst2}>{formaat(max * f)}</text>
          </g>
        ))}
        {punten.map((p, i) => i % stap === 0 && <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill={KLEUR.tekst2}>{p.label}</text>)}
        {punten.length > 1 && <path d={`M ${x(0)},${y(0)} L ${pad('waarde')} L ${x(punten.length - 1)},${y(0)} Z`} fill={KLEUR.reeksZacht} />}
        {heeftVorig && <path d={`M ${pad('vorig')}`} fill="none" stroke={KLEUR.vergelijk} strokeWidth="2" strokeDasharray="5 4" />}
        <path d={`M ${pad('waarde')}`} fill="none" stroke={KLEUR.reeks} strokeWidth="2" strokeLinejoin="round" />
        {punten.length === 1 && <circle cx={x(0)} cy={y(punten[0].waarde)} r="5" fill={KLEUR.reeks} />}
        {h && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - O} stroke={KLEUR.as} strokeDasharray="2 3" />
            {h.vorig !== null && <circle cx={x(hover)} cy={y(h.vorig)} r="4.5" fill="#fff" stroke={KLEUR.vergelijk} strokeWidth="2" />}
            <circle cx={x(hover)} cy={y(h.waarde)} r="5" fill={KLEUR.reeks} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div className="pointer-events-none absolute top-8 z-10 rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg" style={{ left: `clamp(0px, calc(${(x(hover) / B) * 100}% - 70px), calc(100% - 160px))` }}>
          <p className="font-semibold">{h.tooltipLabel}</p>
          <p><span style={{ color: '#86b6ef' }}>●</span> {formaat(h.waarde)}</p>
          {h.vorig !== null && <p className="text-white/70">vorige: {formaat(h.vorig)}{h.vorig > 0 && <> ({h.waarde >= h.vorig ? '+' : ''}{Math.round(((h.waarde - h.vorig) / h.vorig) * 100)}%)</>}</p>}
        </div>
      )}
    </div>
  )
}

export function Staven({ rijen, formaat, max: maxIn }: { rijen: { naam: string; waarde: number; vorig?: number; sub?: string }[]; formaat: (v: number) => string; max?: number }) {
  const max = maxIn ?? Math.max(1, ...rijen.map(r => r.waarde))
  return (
    <ul className="space-y-2.5">
      {rijen.map(r => {
        const delta = r.vorig !== undefined && r.vorig > 0 ? Math.round(((r.waarde - r.vorig) / r.vorig) * 100) : null
        return (
          <li key={r.naam} className="group" title={`${r.naam}: ${formaat(r.waarde)}${r.vorig !== undefined ? ` (vorige: ${formaat(r.vorig)})` : ''}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">{r.naam}{r.sub && <span className="ml-1 text-xs font-normal text-ink/50">{r.sub}</span>}</span>
              <span className="shrink-0 tabular-nums">{formaat(r.waarde)}{delta !== null && <span className={`ml-2 text-xs ${delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>}{r.vorig === 0 && r.waarde > 0 && <span className="ml-2 text-xs text-emerald-700">nieuw</span>}</span>
            </div>
            <div className="h-2.5 rounded-full bg-ink/5">
              <div className="h-full rounded-full transition-all group-hover:brightness-110" style={{ width: `${Math.max(1.5, (r.waarde / max) * 100)}%`, background: KLEUR.reeks }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const DAG = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

export function Heatmap({ data }: { data: number[][] }) {
  // enkel uren waarin er iets gebeurde (± openingsuren)
  const uren = Array.from({ length: 24 }, (_, u) => u).filter(u => data.some(r => r[u] > 0))
  const toon = uren.length ? Array.from({ length: Math.max(...uren) - Math.min(...uren) + 1 }, (_, i) => Math.min(...uren) + i) : []
  const dagen = DAG.map((_, i) => i).filter(i => data[i].some(v => v > 0))
  const max = Math.max(1, ...data.flat())
  const [hover, setHover] = useState<{ d: number; u: number } | null>(null)
  if (!toon.length) return <p className="py-8 text-center text-sm text-ink/50">Nog geen gegevens in deze periode.</p>
  const kleur = (v: number) => v === 0 ? KLEUR.schaal[0] : KLEUR.schaal[Math.min(KLEUR.schaal.length - 1, 1 + Math.floor((v / max) * (KLEUR.schaal.length - 2)))]
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: 3 }}>
          <thead><tr><th />{toon.map(u => <th key={u} className="px-0.5 text-[10px] font-normal text-ink/50">{u}u</th>)}</tr></thead>
          <tbody>
            {dagen.map(d => (
              <tr key={d}>
                <th className="pr-1 text-left text-xs font-medium text-ink/60">{DAG[d]}</th>
                {toon.map(u => (
                  <td key={u} onMouseEnter={() => setHover({ d, u })} onMouseLeave={() => setHover(null)}
                    className="h-7 w-9 rounded text-center text-[10px] tabular-nums" style={{ background: kleur(data[d][u]), color: data[d][u] / max > 0.55 ? '#fff' : KLEUR.tekst2, outline: hover?.d === d && hover.u === u ? `2px solid ${KLEUR.tekst}` : 'none' }}>
                    {data[d][u] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-ink/60">
        <span>{hover ? `${DAG[hover.d]} ${hover.u}u–${hover.u + 1}u: ${data[hover.d][hover.u]} bestelling(en)` : 'Weinig'}</span>
        {!hover && <><span className="flex">{KLEUR.schaal.slice(1).map(c => <span key={c} className="h-2.5 w-4" style={{ background: c }} />)}</span><span>Veel</span></>}
      </div>
    </div>
  )
}
