import Image from 'next/image'
import type { MenuProduct } from '@/lib/catalogus'
import { euro } from '@/lib/geld'

export function Labels({ labels, size = 20 }: { labels: MenuProduct['labels']; size?: number }) {
  if (!labels.length) return null
  return (
    <span className="ml-1.5 inline-flex translate-y-[3px] gap-1">
      {labels.map(l => l.afbeelding
        ? <Image key={l.naam} src={l.afbeelding} alt={l.naam} title={l.naam} width={size} height={size} className="inline-block" style={{ width: size, height: size }} />
        : <span key={l.naam} className="rounded-full px-1.5 text-[10px] font-bold text-white" style={{ background: l.kleur }}>{l.naam}</span>)}
    </span>
  )
}

export default function ProductTegel({ p, onClick, allergie }: { p: MenuProduct; onClick?: () => void; allergie?: { bevat: string[]; onbekend: boolean } }) {
  const dimmen = Boolean(allergie?.bevat.length)
  const inhoud = (
    <>
      <div className={`relative aspect-square overflow-hidden rounded-md bg-sand ring-1 ring-ink/10 ${dimmen ? 'opacity-40' : ''}`}>
        {p.afbeelding && <Image src={p.afbeelding} alt={p.naam} fill sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px" className={`object-cover transition duration-300 ${p.uitverkocht ? 'grayscale opacity-60' : 'group-hover:scale-105'}`} />}
        {p.uitverkocht && (
          <div className="absolute inset-0 grid place-items-center overflow-hidden">
            <span className="-rotate-[20deg] whitespace-nowrap bg-ink/85 px-10 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg sm:text-sm">Tijdelijk uitverkocht</span>
          </div>
        )}
      </div>
      <div className="px-1 pb-1 pt-2.5">
        <h3 className={`font-semibold leading-snug ${p.uitverkocht ? 'text-ink/50' : ''}`}>{p.naam}<Labels labels={p.labels} size={18} /></h3>
        {allergie && allergie.bevat.length > 0 && <p className="mt-1 text-xs font-semibold text-red-700">Bevat {allergie.bevat.join(', ').toLowerCase()}</p>}
        {allergie?.onbekend && <p className="mt-1 text-xs font-semibold text-ink/60">⚠ Allergenen niet ingevuld — vraag in de zaak</p>}
        {p.leeftijdsgrens && <p className="mt-1 mr-1 inline-block rounded bg-ink px-1.5 py-0.5 text-[11px] font-bold text-white">{p.leeftijdsgrens}+</p>}
        {p.beschikbaarBadge && <p className="mt-1 inline-block rounded bg-sand px-1.5 py-0.5 text-[11px] font-semibold text-ink/70">🕒 {p.beschikbaarBadge}</p>}
        {p.omschrijving && <p className="mt-0.5 line-clamp-2 text-sm text-ink/60">{p.omschrijving}</p>}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-semibold">{euro(p.prijsCent)}</span>
          {onClick && !p.uitverkocht && <span className="rounded-md border border-ink px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition group-hover:bg-ink group-hover:text-white">Kies</span>}
        </div>
      </div>
    </>
  )
  if (!onClick) return <div className="group flex flex-col">{inhoud}</div>
  return (
    <button type="button" onClick={onClick} disabled={p.uitverkocht} className="group flex w-full flex-col self-start text-left disabled:cursor-not-allowed" aria-label={`${p.naam} – ${euro(p.prijsCent)}${p.uitverkocht ? ' – tijdelijk uitverkocht' : ''}`}>
      {inhoud}
    </button>
  )
}
