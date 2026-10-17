'use client'
import { useEffect, useState } from 'react'
import { meldingStatus, vraagMeldingen, type MeldingStatus } from './native'

// Enkel in de app: vraagt om meldingen op een logisch moment (na een bestelling, in het account)
export default function MeldingenVraag({ tekst = 'Krijg een melding zodra je bestelling klaar is.' }: { tekst?: string }) {
  const [st, setSt] = useState<MeldingStatus | null>(null)
  useEffect(() => { meldingStatus().then(setSt).catch(() => {}) }, [])
  if (st !== 'vragen' && st !== 'uit') return null
  return (
    <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
      <span className="text-2xl" aria-hidden>🔔</span>
      <p className="min-w-[12rem] flex-1 text-sm">{st === 'uit' ? 'Meldingen staan uit voor De Sneppe. Zet ze aan in de instellingen van je telefoon.' : tekst}</p>
      {st === 'vragen' && <button className="btn-brand btn-sm" onClick={async () => setSt(await vraagMeldingen())}>Meldingen aanzetten</button>}
    </div>
  )
}
