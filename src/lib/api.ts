import { NextResponse } from 'next/server'
import { huidigeAdmin, huidigeKlant } from './auth'

export function fout(bericht: string, status = 400) {
  return NextResponse.json({ fout: bericht }, { status })
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export async function vereisAdmin() {
  const a = await huidigeAdmin()
  if (!a) throw new GeenToegang()
  return a
}

export async function vereisKlant() {
  const k = await huidigeKlant()
  if (!k) throw new GeenToegang()
  return k
}

export class GeenToegang extends Error {}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>
export function api<C = { params: Record<string, string> }>(h: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await h(req, ctx)
    } catch (e) {
      if (e instanceof GeenToegang) return fout('Niet aangemeld', 401)
      console.error('[api]', req.method, req.url, e)
      return fout('Er liep iets mis. Probeer opnieuw.', 500)
    }
  }
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return (await req.json()) as T } catch { return {} as T }
}
