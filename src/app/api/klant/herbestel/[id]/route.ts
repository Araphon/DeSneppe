import { prisma } from '@/lib/db'
import { api, fout, ok, vereisKlant } from '@/lib/api'
import { getProductVoorBestelling } from '@/lib/catalogus'

export const dynamic = 'force-dynamic'

// Zet een eerdere bestelling om naar mandregels met de huidige producten, opties en prijzen
export const GET = api(async (_req, { params }) => {
  const k = await vereisKlant()
  const b = await prisma.bestelling.findUnique({ where: { id: params.id }, include: { regels: true } })
  if (!b || b.klantId !== k.id) return fout('Niet gevonden', 404)
  const regels = []
  const meldingen: string[] = []
  for (const r of b.regels) {
    const prod = r.productId ? await getProductVoorBestelling(r.productId) : null
    if (!prod) { meldingen.push(`${r.productNaam} staat niet meer op het menu.`); continue }
    const p = prod.menu
    if (p.uitverkocht) { meldingen.push(`${p.naam} is tijdelijk uitverkocht.`); continue }
    const oudKeuzes = (r.keuzes as { optie: string; keuze: string }[]) || []
    const keuzes = []
    let ok_ = true
    for (const o of p.opties) {
      const oud = oudKeuzes.find(x => x.optie === o.naam)
      const k2 = (oud && o.keuzes.find(x => x.naam === oud.keuze)) || (o.verplicht ? o.keuzes.find(x => x.standaard) || o.keuzes[0] : undefined)
      if (oud && (!k2 || k2.naam !== oud.keuze)) meldingen.push(`${p.naam}: “${oud.keuze}” bestaat niet meer, we kozen ${k2 ? `“${k2.naam}”` : 'niets'}.`)
      if (!k2 && o.verplicht) ok_ = false
      if (k2) keuzes.push({ optieId: o.id, keuzeId: k2.id, optie: o.naam, keuze: k2.naam, prijsCent: k2.prijsCent })
    }
    if (!ok_) { meldingen.push(`${p.naam} kon niet opnieuw toegevoegd worden.`); continue }
    const oudAanp = ((r.aanpassingen as { naam: string }[]) || []).map(a => a.naam)
    const aanpassingen = p.aanpassingen.filter(a => oudAanp.includes(a.naam)).map(a => ({ id: a.id, naam: a.naam, prijsCent: a.prijsCent }))
    const weg = oudAanp.filter(n => !aanpassingen.some(a => a.naam === n))
    if (weg.length) meldingen.push(`${p.naam}: aanpassing ${weg.map(n => `“${n}”`).join(', ')} bestaat niet meer.`)
    const eenheidCent = Math.max(0, p.prijsCent + keuzes.reduce((s, x) => s + x.prijsCent, 0) + aanpassingen.reduce((s, x) => s + x.prijsCent, 0))
    regels.push({ productId: p.id, naam: p.naam, afbeelding: p.afbeelding, aantal: r.aantal, eenheidCent, keuzes, aanpassingen })
  }
  return ok({ regels, meldingen })
})
