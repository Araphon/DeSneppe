'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { vraag } from '@/components/fetcher'

function Form() {
  const token = useSearchParams().get('token') || ''
  const router = useRouter()
  const [ww, setWw] = useState('')
  const [fout, setFout] = useState('')
  return (
    <form className="card space-y-3 p-6" onSubmit={async e => {
      e.preventDefault(); setFout('')
      try { await vraag('/api/klant/wachtwoord-reset', 'POST', { token, wachtwoord: ww }); router.push('/account') } catch (err) { setFout((err as Error).message) }
    }}>
      <label className="label" htmlFor="ww">Nieuw wachtwoord</label>
      <input id="ww" type="password" className="input" minLength={8} required autoComplete="new-password" value={ww} onChange={e => setWw(e.target.value)} />
      {fout && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{fout}</p>}
      <button className="btn-brand w-full">Opslaan</button>
    </form>
  )
}

export default function Wachtwoord() {
  return <div className="container-x max-w-md py-12"><h1 className="h-display mb-6 text-3xl">Nieuw wachtwoord</h1><Suspense><Form /></Suspense></div>
}
