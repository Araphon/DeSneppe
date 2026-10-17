import { z } from 'zod'
import { prisma } from './db'
import { slugify } from './slug'

const cent = z.coerce.number().int().min(-100000).max(100000)
const allergeenLijst = z.array(z.object({ allergeenId: z.string(), soort: z.enum(['BEVAT', 'SPOREN']) })).default([])
export const productSchema = z.object({
  naam: z.string().trim().min(1, 'Naam is verplicht').max(120),
  omschrijving: z.string().trim().max(1000).nullable().optional(),
  afbeelding: z.string().nullable().optional(),
  prijsExcl: z.coerce.number().min(0).max(10000),
  btwPct: z.coerce.number().min(0).max(30),
  categorieId: z.string().min(1, 'Kies een categorie'),
  zichtbaar: z.boolean().default(true),
  volgorde: z.coerce.number().int().default(0),
  aanpassingenActief: z.boolean().default(false),
  aanpassingenTitel: z.string().trim().max(60).default('Aanpassingen'),
  aanpassingen: z.array(z.object({ id: z.string().optional(), naam: z.string().trim().min(1).max(120), prijsCent: cent, actief: z.boolean().default(true) })).default([]),
  opties: z.array(z.object({
    id: z.string().optional(),
    naam: z.string().trim().min(1, 'Elke optie heeft een vraag nodig').max(120),
    verplicht: z.boolean().default(true),
    wijzigtAllergenen: z.boolean().default(false),
    keuzes: z.array(z.object({ id: z.string().optional(), naam: z.string().trim().min(1, 'Elke keuze heeft een naam nodig').max(120), prijsCent: cent, allergenen: z.string().trim().max(1000).nullable().optional(), standaard: z.boolean().default(false), actief: z.boolean().default(true), allergenenLijst: allergeenLijst })).default([]),
  })).default([]),
  allergenenActief: z.boolean().default(false),
  allergenen: z.string().trim().max(2000).nullable().optional(),
  loyaltyActief: z.boolean().default(false),
  loyaltyPunten: z.coerce.number().int().min(0).max(100000).default(0),
  stickerPrinten: z.boolean().default(false),
  maxPerBestelling: z.coerce.number().int().min(1).max(999).nullable().optional(),
  leeftijdsgrens: z.coerce.number().int().min(0).max(21).nullable().optional(),
  labelIds: z.array(z.string()).default([]),
  allergenenLijst: allergeenLijst,
  beschikbaarDagen: z.array(z.number().int().min(1).max(7)).default([]),
  beschikbaarVan: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  beschikbaarTot: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  seizoenVan: z.string().regex(/^\d{2}-\d{2}$/).nullable().optional(),
  seizoenTot: z.string().regex(/^\d{2}-\d{2}$/).nullable().optional(),
})
export type ProductInput = z.infer<typeof productSchema>

async function uniekeSlug(naam: string, eigenId?: string) {
  const basis = slugify(naam)
  for (let n = 1; ; n++) {
    const s = n === 1 ? basis : `${basis}-${n}`
    const b = await prisma.product.findUnique({ where: { slug: s }, select: { id: true } })
    if (!b || b.id === eigenId) return s
  }
}

export async function slaProductOp(d: ProductInput, id?: string) {
  const basis = {
    naam: d.naam, omschrijving: d.omschrijving || null, afbeelding: d.afbeelding || null,
    prijsExcl: d.prijsExcl, btwPct: d.btwPct, categorieId: d.categorieId, zichtbaar: d.zichtbaar, volgorde: d.volgorde,
    aanpassingenActief: d.aanpassingenActief, aanpassingenTitel: d.aanpassingenTitel || 'Aanpassingen',
    allergenenActief: d.allergenenActief, allergenen: d.allergenen || null,
    loyaltyActief: d.loyaltyActief, loyaltyPunten: d.loyaltyPunten, stickerPrinten: d.stickerPrinten,
    maxPerBestelling: d.maxPerBestelling || null,
    leeftijdsgrens: d.leeftijdsgrens || null,
    beschikbaarDagen: d.beschikbaarDagen.length === 7 ? [] : [...d.beschikbaarDagen].sort(),
    beschikbaarVan: d.beschikbaarVan || null,
    beschikbaarTot: d.beschikbaarTot || null,
    seizoenVan: d.seizoenVan && d.seizoenTot ? d.seizoenVan : null,
    seizoenTot: d.seizoenVan && d.seizoenTot ? d.seizoenTot : null,
    slug: await uniekeSlug(d.naam, id),
  }
  return prisma.$transaction(async tx => {
    const p = id
      ? await tx.product.update({ where: { id }, data: basis })
      : await tx.product.create({ data: basis })

    // Aanpassingen synchroniseren
    const aIds = d.aanpassingen.map(a => a.id).filter(Boolean) as string[]
    await tx.productAanpassing.deleteMany({ where: { productId: p.id, id: { notIn: aIds } } })
    for (const [i, a] of d.aanpassingen.entries()) {
      const data = { naam: a.naam, prijsCent: a.prijsCent, actief: a.actief, volgorde: i }
      if (a.id) await tx.productAanpassing.updateMany({ where: { id: a.id, productId: p.id }, data })
      else await tx.productAanpassing.create({ data: { ...data, productId: p.id } })
    }

    // Opties + keuzes synchroniseren
    const oIds = d.opties.map(o => o.id).filter(Boolean) as string[]
    await tx.productOptie.deleteMany({ where: { productId: p.id, id: { notIn: oIds } } })
    for (const [i, o] of d.opties.entries()) {
      const data = { naam: o.naam, verplicht: o.verplicht, wijzigtAllergenen: o.wijzigtAllergenen, volgorde: i }
      const optie = o.id && (await tx.productOptie.findFirst({ where: { id: o.id, productId: p.id } }))
        ? await tx.productOptie.update({ where: { id: o.id }, data })
        : await tx.productOptie.create({ data: { ...data, productId: p.id } })
      const kIds = o.keuzes.map(k => k.id).filter(Boolean) as string[]
      await tx.productOptieKeuze.deleteMany({ where: { optieId: optie.id, id: { notIn: kIds } } })
      const heeftStandaard = o.keuzes.some(k => k.standaard)
      for (const [j, k] of o.keuzes.entries()) {
        const kd = { naam: k.naam, prijsCent: k.prijsCent, allergenen: k.allergenen || null, standaard: heeftStandaard ? k.standaard : j === 0, actief: k.actief, volgorde: j }
        let keuzeId = k.id
        if (keuzeId) await tx.productOptieKeuze.updateMany({ where: { id: keuzeId, optieId: optie.id }, data: kd })
        else keuzeId = (await tx.productOptieKeuze.create({ data: { ...kd, optieId: optie.id } })).id
        await tx.keuzeAllergeen.deleteMany({ where: { keuzeId } })
        if (o.wijzigtAllergenen && k.allergenenLijst.length) await tx.keuzeAllergeen.createMany({ data: k.allergenenLijst.map(a => ({ keuzeId: keuzeId!, allergeenId: a.allergeenId, soort: a.soort })), skipDuplicates: true })
      }
    }

    // Allergenen
    await tx.productAllergeen.deleteMany({ where: { productId: p.id } })
    if (d.allergenenLijst.length) await tx.productAllergeen.createMany({ data: d.allergenenLijst.map(a => ({ productId: p.id, allergeenId: a.allergeenId, soort: a.soort })), skipDuplicates: true })

    // Labels
    await tx.productLabel.deleteMany({ where: { productId: p.id } })
    if (d.labelIds.length) await tx.productLabel.createMany({ data: d.labelIds.map(labelId => ({ productId: p.id, labelId })), skipDuplicates: true })
    return p
  })
}

export const adminProductInclude = {
  labels: true,
  aanpassingen: { orderBy: { volgorde: 'asc' as const } },
  allergenenLijst: { select: { allergeenId: true, soort: true } },
  opties: { orderBy: { volgorde: 'asc' as const }, include: { keuzes: { orderBy: { volgorde: 'asc' as const }, include: { allergenenLijst: { select: { allergeenId: true, soort: true } } } } } },
}
