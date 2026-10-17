import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { productSchema, slaProductOp } from '@/lib/productOpslaan'
import { isUitverkocht } from '@/lib/catalogus'
import { productPrijsCent } from '@/lib/geld'

export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  await vereisAdmin()
  const lijst = await prisma.product.findMany({
    include: { categorie: true, labels: { include: { label: true } }, _count: { select: { aanpassingen: true, opties: true } } },
    orderBy: [{ categorie: { volgorde: 'asc' } }, { volgorde: 'asc' }, { naam: 'asc' }],
  })
  return ok(lijst.map(p => ({
    id: p.id, naam: p.naam, afbeelding: p.afbeelding, categorieId: p.categorieId, categorie: p.categorie.naam,
    prijsCent: productPrijsCent(p.prijsExcl, p.btwPct), btwPct: Number(p.btwPct), zichtbaar: p.zichtbaar,
    uitverkocht: isUitverkocht(p), uitverkochtTot: p.uitverkochtTot, stickerPrinten: p.stickerPrinten,
    loyaltyPunten: p.loyaltyActief ? p.loyaltyPunten : 0, volgorde: p.volgorde,
    labels: p.labels.map(l => ({ naam: l.label.naam, afbeelding: l.label.afbeelding, kleur: l.label.kleur })),
    aantalAanpassingen: p.aanpassingenActief ? p._count.aanpassingen : 0, aantalOpties: p._count.opties,
  })))
})

export const POST = api(async req => {
  await vereisAdmin()
  const p = productSchema.safeParse(await body(req))
  if (!p.success) return fout(p.error.issues[0].message)
  const prod = await slaProductOp(p.data)
  return ok({ id: prod.id })
})
