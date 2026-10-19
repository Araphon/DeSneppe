'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import AuthFormulier from '@/components/AuthFormulier'
import AppBrug from '@/components/app/AppBrug'

// Startscherm van de native app: eerst aanmelden, daarna meteen naar de bestelkant.
// Rondkijken zonder account blijft mogelijk (vereiste van Apple).
export default function AppStart() {
  const [klaar, setKlaar] = useState(false)
  const verder = (onvolledig?: boolean) => location.replace(onvolledig ? '/account/aanvullen?terug=/bestellen' : '/bestellen')

  useEffect(() => {
    fetch('/api/klant/profiel').then(r => r.json())
      .then(r => { if (r.klant) verder(r.klant.onvolledig); else setKlaar(true) })
      .catch(() => setKlaar(true))
  }, [])

  return (
    <main className="min-h-screen bg-ink text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
      <AppBrug />
      <div className="mx-auto w-full max-w-md px-5">
        <div className="flex flex-col items-center text-center">
          <Image src="/logo-wit.png" alt="De Sneppe" width={120} height={138} priority className="h-28 w-auto" />
          <h1 className="h-display mt-6 text-3xl">Welkom bij De Sneppe</h1>
          <p className="mt-2 text-white/70">Meld je aan en bestel je broodje in een paar tikken.</p>
        </div>
        {klaar ? (
          <>
            <div className="card mt-8 p-6 text-ink">
              <AuthFormulier onKlaar={async () => {
                const r = await fetch('/api/klant/profiel').then(x => x.json()).catch(() => null)
                verder(r?.klant?.onvolledig)
              }} />
            </div>
            <Link href="/bestellen" className="mt-6 block text-center font-semibold text-white/80 underline underline-offset-4">Eerst het menu bekijken</Link>
          </>
        ) : (
          <div className="mx-auto mt-12 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-brand" aria-label="Laden" />
        )}
      </div>
    </main>
  )
}
