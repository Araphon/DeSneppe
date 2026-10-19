import type { Metadata, Viewport } from 'next'
import { Josefin_Sans, DM_Sans } from 'next/font/google'
import './globals.css'

const display = Josefin_Sans({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display', display: 'swap' })
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' })

const SITE = process.env.SITE_URL || 'https://de-sneppe.be'
const noindex = process.env.NOINDEX === '1'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'De Sneppe – Broodjesbar in Meulebeke | Online bestellen', template: '%s | De Sneppe Meulebeke' },
  description: 'Broodjesbar De Sneppe in Meulebeke: vers belegde broodjes, warme broodjes, panini’s, wraps, pasta, soep en dagschotels. Bestel online en haal af aan de Bruggesteenweg 83.',
  applicationName: 'De Sneppe',
  openGraph: { type: 'website', locale: 'nl_BE', siteName: 'De Sneppe', images: [{ url: '/og.jpg', width: 1200, height: 630 }] },
  robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
  icons: { apple: '/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest',
}

const HERLAAD = `(function(){function h(){try{var k='sn_herlaad',t=+sessionStorage.getItem(k)||0;if(Date.now()-t<30000)return;sessionStorage.setItem(k,Date.now())}catch(e){}location.reload()}window.addEventListener('error',function(e){var el=e.target;if(el&&(el.tagName==='SCRIPT'||el.tagName==='LINK')&&/\\/_next\\/static\\//.test(el.src||el.href||''))h();else if(/ChunkLoadError|Loading (CSS )?chunk/.test(e.message||''))h()},true);window.addEventListener('unhandledrejection',function(e){var r=e.reason;if(r&&/ChunkLoadError|Loading (CSS )?chunk/.test(r.name+' '+r.message))h()})})()`

export const viewport: Viewport = { themeColor: '#141414', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

// In de app (Capacitor, eigen user-agent) meteen de app-weergave tonen, vóór de eerste weergave
// en de homepagina (website) overslaan: de app start op het aanmeld-/bestelscherm
const APP = `try{if(/DeSneppeApp/.test(navigator.userAgent)){document.documentElement.dataset.app='1';if(location.pathname==='/')location.replace('/app')}}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE" className={`${display.variable} ${body.variable}`}>
      <head>
        {/* Na een update kan een open tabblad naar oude JS-bestanden vragen → één keer automatisch herladen */}
        <script dangerouslySetInnerHTML={{ __html: HERLAAD }} />
        <script dangerouslySetInnerHTML={{ __html: APP }} />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  )
}
