'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { vraag } from './fetcher'
import { useWinkelmand, type MandRegel } from './winkelmand'

export default function HerbestelKnop({ id, klein = false, naarAfrekenen = true }: { id: string; klein?: boolean; naarAfrekenen?: boolean }) {
  const { voegToe } = useWinkelmand()
  const router = useRouter()
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState<string[]>([])
  return (
    <div>
      <button className={klein ? 'btn-ink btn-sm' : 'btn-brand'} disabled={bezig} onClick={async e => {
        e.stopPropagation(); setBezig(true); setMelding([])
        try {
          const r = await vraag<{ regels: Omit<MandRegel, 'key'>[]; meldingen: string[] }>(`/api/klant/herbestel/${id}`)
          r.regels.forEach(x => voegToe(x))
          if (r.meldingen.length) { setMelding(r.meldingen); setBezig(false); return }
          if (naarAfrekenen && r.regels.length) router.push('/afrekenen')
          else setBezig(false)
        } catch (err) { setMelding([(err as Error).message]); setBezig(false) }
      }}>🔁 {bezig ? 'Even geduld…' : 'Opnieuw bestellen'}</button>
      {melding.length > 0 && (
        <div className="mt-2 rounded-lg bg-sand p-3 text-sm">
          <ul className="list-disc pl-4">{melding.map((m, i) => <li key={i}>{m}</li>)}</ul>
          <button className="mt-2 font-semibold underline" onClick={() => router.push('/afrekenen')}>Verder naar afrekenen</button>
        </div>
      )}
    </div>
  )
}
