'use client'
import { useEffect } from 'react'
import { isNative, platform, registreerAlsToegestaan } from './native'

// Koppeling tussen de website en de native app: terugkeer uit de in-app browser, terugknop, statusbalk en meldingen.
export default function AppBrug() {
  useEffect(() => {
    if (!isNative()) return
    document.documentElement.dataset.app = '1'
    const opruimen: (() => void)[] = []
    ;(async () => {
      const [{ App }, { Browser }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
        import('@capacitor/app'), import('@capacitor/browser'), import('@capacitor/splash-screen'), import('@capacitor/status-bar'),
      ])
      SplashScreen.hide().catch(() => {})
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
      if (platform() === 'android') StatusBar.setBackgroundColor({ color: '#141414' }).catch(() => {})

      // be.desneppe.app://login?code=… en be.desneppe.app://bestelling/<id>
      const h1 = await App.addListener('appUrlOpen', ({ url }) => {
        let u: URL
        try { u = new URL(url) } catch { return }
        Browser.close().catch(() => {})
        const pad = (u.host + u.pathname).replace(/\/+$/, '')
        if (pad === 'login') {
          const code = u.searchParams.get('code')
          location.href = code ? `/api/auth/app-login?code=${encodeURIComponent(code)}&terug=${encodeURIComponent(u.searchParams.get('terug') || '/account')}` : `/account?sso=${encodeURIComponent(u.searchParams.get('fout') || 'mislukt')}`
        } else if (pad.startsWith('bestelling/')) {
          try { sessionStorage.removeItem('sn_betaling') } catch {}
          location.href = `/${pad}?betaling=1`
        } else if (u.protocol.startsWith('http')) {
          location.href = u.pathname + u.search + u.hash
        }
      })
      // In-app browser gesloten zonder terugsprong (bv. betaling afgebroken) → naar de bestelling
      const h2 = await Browser.addListener('browserFinished', () => {
        let id: string | null = null
        try { id = sessionStorage.getItem('sn_betaling'); sessionStorage.removeItem('sn_betaling') } catch {}
        if (id) location.href = `/bestelling/${id}?betaling=1`
      })
      const h3 = await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack && location.pathname !== '/') history.back()
        else App.minimizeApp().catch(() => {})
      })
      opruimen.push(() => { h1.remove(); h2.remove(); h3.remove() })

      // Meldingen: enkel registreren als de klant aangemeld is en al toestemming gaf
      const r = await fetch('/api/klant/profiel').then(r => r.json()).catch(() => null)
      if (r?.klant) registreerAlsToegestaan().catch(() => {})
    })()
    return () => opruimen.forEach(f => f())
  }, [])
  return null
}
