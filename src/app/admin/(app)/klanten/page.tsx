'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'
import { PaginaKop } from '@/components/admin/ui'

type K = { id: string; naam: string; email: string; telefoon: string; gemeente: string; punten: number; noShows: number; alleenOnline: boolean; geblokkeerd: boolean; bestellingen: number; aangemaaktOp: string; mailActies: boolean }

export default function Klanten() {
  const [q, setQ] = useState('')
  const [d, setD] = useState<{ totaal: number; klanten: K[] } | null>(null)
  useEffect(() => { const t = setTimeout(() => vraag<{ totaal: number; klanten: K[] }>(`/api/admin/klanten?q=${encodeURIComponent(q)}`).then(setD), 250); return () => clearTimeout(t) }, [q])
  return (
    <>
      <PaginaKop titel="Klanten" sub={d ? `${d.totaal} klantenaccounts` : undefined} />
      <input className="input mb-4 max-w-sm" placeholder="Zoek op naam, e-mail of telefoon…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sand/60 text-left text-xs uppercase text-ink/60"><tr><th className="p-3">Naam</th><th className="p-3">Contact</th><th className="hidden p-3 md:table-cell">Gemeente</th><th className="p-3 text-right">Bestellingen</th><th className="p-3 text-right">Punten</th></tr></thead>
          <tbody className="divide-y divide-ink/5">
            {d?.klanten.map(k => (
              <tr key={k.id} className="hover:bg-cream">
                <td className="p-3"><Link href={`/admin/klanten/${k.id}`} className="font-semibold hover:underline">{k.naam}</Link>{k.mailActies && <span title="Wil acties ontvangen" className="ml-1">📣</span>}{k.geblokkeerd && <span className="ml-2 rounded bg-red-600 px-1.5 text-xs text-white">geblokkeerd</span>}{!k.geblokkeerd && k.noShows > 0 && <span className="ml-2 rounded bg-red-50 px-1.5 text-xs font-semibold text-red-700">{k.noShows} no-show{k.noShows > 1 ? 's' : ''}</span>}{k.alleenOnline && <span className="ml-2 rounded bg-sand px-1.5 text-xs">enkel online</span>}</td>
                <td className="p-3 text-ink/70">{k.email}<br />{k.telefoon}</td>
                <td className="hidden p-3 md:table-cell">{k.gemeente}</td>
                <td className="p-3 text-right">{k.bestellingen}</td>
                <td className="p-3 text-right font-semibold">{k.punten}</td>
              </tr>
            ))}
            {d && !d.klanten.length && <tr><td colSpan={5} className="p-8 text-center text-ink/50">Geen klanten gevonden.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
