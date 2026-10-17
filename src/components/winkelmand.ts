'use client'
import { useEffect, useState, useCallback } from 'react'

export type MandKeuze = { optieId: string; keuzeId: string; optie: string; keuze: string; prijsCent: number }
export type MandAanpassing = { id: string; naam: string; prijsCent: number }
export type MandRegel = {
  key: string
  productId: string
  naam: string
  afbeelding: string | null
  aantal: number
  eenheidCent: number
  keuzes: MandKeuze[]
  aanpassingen: MandAanpassing[]
}

const SLEUTEL = 'sneppe_mand_v1'
const EVENT = 'sneppe-mand'

function lees(): MandRegel[] {
  try { return JSON.parse(localStorage.getItem(SLEUTEL) || '[]') } catch { return [] }
}
function schrijf(m: MandRegel[]) {
  try { localStorage.setItem(SLEUTEL, JSON.stringify(m)) } catch {}
  window.dispatchEvent(new Event(EVENT))
}

export function regelKey(productId: string, keuzes: MandKeuze[], aanpassingen: MandAanpassing[]) {
  return [productId, ...keuzes.map(k => k.keuzeId).sort(), '|', ...aanpassingen.map(a => a.id).sort()].join(':')
}

export function useWinkelmand() {
  const [mand, setMand] = useState<MandRegel[]>([])
  const [geladen, setGeladen] = useState(false)
  useEffect(() => {
    const sync = () => setMand(lees())
    sync(); setGeladen(true)
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])

  const voegToe = useCallback((r: Omit<MandRegel, 'key'>) => {
    const m = lees()
    const key = regelKey(r.productId, r.keuzes, r.aanpassingen)
    const bestaand = m.find(x => x.key === key)
    if (bestaand) bestaand.aantal += r.aantal
    else m.push({ ...r, key })
    schrijf(m)
  }, [])

  const zetAantal = useCallback((key: string, aantal: number) => {
    const m = lees().map(x => x.key === key ? { ...x, aantal } : x).filter(x => x.aantal > 0)
    schrijf(m)
  }, [])

  const leeg = useCallback(() => schrijf([]), [])

  const totaalCent = mand.reduce((s, r) => s + r.eenheidCent * r.aantal, 0)
  const aantal = mand.reduce((s, r) => s + r.aantal, 0)
  return { mand, geladen, voegToe, zetAantal, leeg, totaalCent, aantal }
}
