'use client'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'

function Form() {
  const token = useSearchParams().get('token') || ''
  const router = useRouter()
  const [info, setInfo] = useState<{ naam: string; email: string } | null>(null)
  const [fout, setFout] = useState('')
  const [ww, setWw] = useState('')
  const [bezig, setBezig] = useState(false)
  useEffect(() => { vraag<{ naam: string; email: string }>(`/api/admin/uitnodiging?token=${encodeURIComponent(token)}`).then(setInfo).catch(e => setFout(e.message)) }, [token])
  return (
    <form className="w-full max-w-sm rounded-xl bg-white p-8" onSubmit={async e => {
      e.preventDefault(); setBezig(true); setFout('')
      try { await vraag('/api/admin/uitnodiging', 'POST', { token, wachtwoord: ww }); router.push('/admin'); router.refresh() } catch (err) { setFout((err as Error).message); setBezig(false) }
    }}>
      <Image src="/logo.png" alt="De Sneppe" width={120} height={120} className="mx-auto mb-4 h-24 w-auto" />
      <h1 className="text-center font-display text-2xl font-bold">Welkom{info ? `, ${info.naam}` : ''}!</h1>
      {info && <p className="mb-4 text-center text-sm text-ink/60">Kies een wachtwoord voor {info.email}</p>}
      {info && (
        <div className="space-y-3">
          <input type="email" className="hidden" autoComplete="username" value={info.email} readOnly />
          <div><label className="label" htmlFor="w">Wachtwoord</label><input id="w" type="password" className="input" required minLength={10} autoComplete="new-password" value={ww} onChange={e => setWw(e.target.value)} /><p className="mt-1 text-xs text-ink/50">Minstens 10 tekens</p></div>
          <button className="btn-ink w-full py-3" disabled={bezig}>{bezig ? 'Even geduld…' : 'Wachtwoord opslaan'}</button>
        </div>
      )}
      {fout && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{fout}</p>}
    </form>
  )
}

export default function Uitnodiging() {
  return <div className="grid min-h-screen place-items-center bg-ink p-4"><Suspense><Form /></Suspense></div>
}
