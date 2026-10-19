import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Demo-account (App Store-reviewer van de kassa-app): enkel de kassa, met nep-bestellingen en zonder echte wijzigingen.
// De bestelling-routes zelf geven nep-data terug (lib/demo.ts); hier wordt al de rest afgeschermd.

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me')

const DEMO_GET = [/^\/api\/admin\/bestellingen$/, /^\/api\/admin\/producten$/, /^\/api\/admin\/pauze$/]
const DEMO_SCHRIJF = [/^\/api\/admin\/(login|logout)$/, /^\/api\/admin\/bestellingen\/[^/]+(\/print-claim)?$/]
const DEMO_PAGINA = [/^\/admin\/(login|logout)(\/|$)/]

async function isDemo(req: NextRequest) {
  const t = req.cookies.get('sn_admin')?.value
  if (!t) return false
  try {
    const { payload } = await jwtVerify(t, secret())
    return payload.rol === 'admin' && payload.demo === true
  } catch { return false }
}

export async function middleware(req: NextRequest) {
  if (!(await isDemo(req))) return NextResponse.next()
  const pad = req.nextUrl.pathname
  if (pad.startsWith('/api/')) {
    if (req.method === 'GET' || req.method === 'HEAD') {
      return DEMO_GET.some(r => r.test(pad)) ? NextResponse.next() : NextResponse.json({ fout: 'Niet beschikbaar in de demo' }, { status: 403 })
    }
    // Wijzigingen doen niets, maar de app krijgt "gelukt" terug
    return DEMO_SCHRIJF.some(r => r.test(pad)) ? NextResponse.next() : NextResponse.json({ ok: true, demo: true })
  }
  if (DEMO_PAGINA.some(r => r.test(pad))) return NextResponse.next()
  return NextResponse.redirect(new URL('/kassa', req.url))
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] }
