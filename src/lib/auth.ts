import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './db'

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me')

export const ADMIN_COOKIE = 'sn_admin'
export const KLANT_COOKIE = 'sn_klant'

type Rol = 'admin' | 'klant'

export async function maakToken(sub: string, rol: Rol, dagen = 60, extra: { demo?: boolean } = {}) {
  return new SignJWT({ rol, ...(extra.demo ? { demo: true } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${dagen}d`)
    .sign(secret())
}

export async function leesToken(token: string | undefined, rol: Rol): Promise<string | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    if (payload.rol !== rol || !payload.sub) return null
    return payload.sub
  } catch {
    return null
  }
}

export function cookieOpties(dagen = 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: dagen * 86400,
  }
}

export async function huidigeAdmin() {
  const id = await leesToken(cookies().get(ADMIN_COOKIE)?.value, 'admin')
  if (!id) return null
  const a = await prisma.adminGebruiker.findUnique({ where: { id } })
  return a && a.actief ? a : null
}

export async function huidigeKlant() {
  const id = await leesToken(cookies().get(KLANT_COOKIE)?.value, 'klant')
  if (!id) return null
  return prisma.klant.findUnique({ where: { id } })
}

// Simpele rate limit per sleutel (in-memory, 1 worker)
const pogingen = new Map<string, { n: number; tot: number }>()
export function rateLimit(sleutel: string, max = 8, vensterMs = 10 * 60000): boolean {
  const nu = Date.now()
  const p = pogingen.get(sleutel)
  if (!p || p.tot < nu) { pogingen.set(sleutel, { n: 1, tot: nu + vensterMs }); return true }
  p.n++
  return p.n <= max
}

// Eenmalige inlogcode om een SSO-aanmelding uit de in-app browser over te dragen naar de app (2 minuten geldig)
const gebruikteCodes = new Map<string, number>()
export async function maakAppLoginCode(klantId: string) {
  return new SignJWT({ rol: 'applogin' }).setProtectedHeader({ alg: 'HS256' }).setSubject(klantId)
    .setJti(crypto.randomUUID()).setIssuedAt().setExpirationTime('2m').sign(secret())
}
export async function leesAppLoginCode(code: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(code, secret())
    if (payload.rol !== 'applogin' || !payload.sub || !payload.jti || gebruikteCodes.has(payload.jti)) return null
    const nu = Date.now()
    gebruikteCodes.forEach((tot, k) => { if (tot < nu) gebruikteCodes.delete(k) })
    gebruikteCodes.set(payload.jti, nu + 5 * 60000)
    return payload.sub
  } catch { return null }
}
