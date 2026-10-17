'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'

export default function Login() {
  const router = useRouter()
  const [setup, setSetup] = useState<boolean | null>(null)
  const [v, setV] = useState({ naam: '', email: '', wachtwoord: '' })
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)
  useEffect(() => { vraag<{ nodig: boolean }>('/api/admin/setup').then(r => setSetup(r.nodig)).catch(() => setSetup(false)) }, [])
  return (
    <div className="grid min-h-screen place-items-center bg-ink p-4">
      <form className="w-full max-w-sm rounded-3xl bg-white p-8" onSubmit={async e => {
        e.preventDefault(); setFout(''); setBezig(true)
        try {
          await vraag(setup ? '/api/admin/setup' : '/api/admin/login', 'POST', v)
          router.push(new URLSearchParams(window.location.search).get('terug') || '/admin'); router.refresh()
        } catch (err) { setFout((err as Error).message); setBezig(false) }
      }}>
        <Image src="/logo.png" alt="De Sneppe" width={120} height={120} className="mx-auto mb-4 h-24 w-auto" />
        <h1 className="mb-1 text-center font-display text-2xl font-bold">{setup ? 'Beheerder aanmaken' : 'Beheer'}</h1>
        {setup && <p className="mb-4 text-center text-sm text-ink/60">Er is nog geen beheerder. Maak hier het eerste account aan.</p>}
        <div className="mt-4 space-y-3">
          {setup && <div><label className="label" htmlFor="n">Naam</label><input id="n" className="input" required value={v.naam} onChange={e => setV({ ...v, naam: e.target.value })} /></div>}
          <div><label className="label" htmlFor="e">E-mailadres</label><input id="e" type="email" className="input" required autoComplete="username" value={v.email} onChange={e => setV({ ...v, email: e.target.value })} /></div>
          <div><label className="label" htmlFor="w">Wachtwoord</label><input id="w" type="password" className="input" required minLength={setup ? 10 : 1} autoComplete={setup ? 'new-password' : 'current-password'} value={v.wachtwoord} onChange={e => setV({ ...v, wachtwoord: e.target.value })} />{setup && <p className="mt-1 text-xs text-ink/50">Minstens 10 tekens</p>}</div>
          {fout && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{fout}</p>}
          <button className="btn-ink w-full py-3" disabled={bezig || setup === null}>{bezig ? 'Even geduld…' : setup ? 'Account aanmaken' : 'Aanmelden'}</button>
        </div>
      </form>
    </div>
  )
}
