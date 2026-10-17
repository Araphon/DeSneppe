'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { vraag } from '@/components/fetcher'

type K = { voornaam: string; naam: string; adres: string; postcode: string; gemeente: string; geboortedatum: string; telefoon: string; email: string; mailBestelling: boolean; pushBestelling: boolean; mailNieuws: boolean; mailActies: boolean }

function Form() {
  const router = useRouter()
  const terug = useSearchParams().get('terug') || '/account'
  const [k, setK] = useState<K | null>(null)
  const [marketing, setMarketing] = useState(false)
  const [akkoord, setAkkoord] = useState(false)
  const [fout, setFout] = useState('')
  useEffect(() => { vraag<{ klant: K | null }>('/api/klant/profiel').then(r => r.klant ? setK(r.klant) : router.replace('/account')) }, [router])
  if (!k) return <p className="text-ink/50">Laden…</p>
  const veld = (n: keyof K, label: string, type = 'text', extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="label" htmlFor={n}>{label}</label><input id={n} type={type} className="input" required value={String(k[n] ?? '')} onChange={e => setK({ ...k, [n]: e.target.value })} {...extra} /></div>
  )
  return (
    <form className="card space-y-3 p-6" onSubmit={async e => {
      e.preventDefault(); setFout('')
      if (!akkoord) return setFout('Ga akkoord met de algemene voorwaarden en de privacyverklaring.')
      try { await vraag('/api/klant/profiel', 'PUT', { ...k, mailActies: marketing, mailNieuws: marketing, aanvullen: true }); router.push(terug) } catch (err) { setFout((err as Error).message) }
    }}>
      <p className="text-ink/70">Welkom! Om te kunnen bestellen hebben we nog een paar gegevens nodig.</p>
      <div className="grid gap-3 sm:grid-cols-2">{veld('voornaam', 'Voornaam')}{veld('naam', 'Naam')}</div>
      {veld('adres', 'Adres', 'text', { placeholder: 'Straat en huisnummer', autoComplete: 'street-address' })}
      <div className="grid grid-cols-[110px_1fr] gap-3">{veld('postcode', 'Postcode', 'text', { maxLength: 4, inputMode: 'numeric' })}{veld('gemeente', 'Gemeente')}</div>
      <div className="grid gap-3 sm:grid-cols-2">{veld('geboortedatum', 'Geboortedatum', 'date')}{veld('telefoon', 'Telefoon', 'tel')}</div>
      <label className="flex gap-2 pt-1 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={marketing} onChange={e => setMarketing(e.target.checked)} />Ja, stuur me acties, nieuwe broodjes en een verjaardagsverrassing.</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={akkoord} onChange={e => setAkkoord(e.target.checked)} />Ik ga akkoord met de <a href="/algemene-voorwaarden" target="_blank" className="underline">algemene voorwaarden</a> en de <a href="/privacy" target="_blank" className="underline">privacyverklaring</a></label>
      {fout && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{fout}</p>}
      <button className="btn-brand w-full py-3">Opslaan en verder</button>
    </form>
  )
}

export default function Aanvullen() {
  return <div className="container-x max-w-lg py-12"><h1 className="h-display mb-6 text-3xl">Nog even je gegevens</h1><Suspense><Form /></Suspense></div>
}
