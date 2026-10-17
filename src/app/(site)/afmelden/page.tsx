'use client'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { vraag } from '@/components/fetcher'

function Inhoud() {
  const t = useSearchParams().get('t') || ''
  const [r, setR] = useState<{ onderwerp: string } | null>(null)
  const [fout, setFout] = useState('')
  useEffect(() => { vraag<{ onderwerp: string }>('/api/afmelden', 'POST', { t }).then(setR).catch(e => setFout(e.message)) }, [t])
  return (
    <div className="card p-8 text-center">
      {!r && !fout && <p className="text-ink/50">Even geduld…</p>}
      {r && <><p className="text-4xl">✓</p><h1 className="mt-2 font-display text-2xl font-bold">Je bent afgemeld</h1><p className="mt-2 text-ink/70">Je krijgt geen e-mails meer over “{r.onderwerp}”.</p></>}
      {fout && <><h1 className="font-display text-2xl font-bold">Oeps</h1><p className="mt-2 text-ink/70">{fout}</p></>}
      <Link href="/account#meldingen" className="btn-ghost mt-6">Al mijn meldingsvoorkeuren</Link>
    </div>
  )
}

export default function Afmelden() {
  return <div className="container-x max-w-md py-16"><Suspense><Inhoud /></Suspense></div>
}
