import { prisma } from './db'
import { productPrijsCent } from './geld'
import { beschikbaarBadge, inSeizoen, regelsVan, type BeschikbaarRegels } from './beschikbaarheid'
import { datumPlus, vandaagLokaal } from './tijd'

export function isUitverkocht(p: { uitverkocht: boolean; uitverkochtTot: Date | null }) {
  if (!p.uitverkocht) return false
  return !p.uitverkochtTot || p.uitverkochtTot.getTime() > Date.now()
}

const allergeenInclude = { include: { allergeen: true }, orderBy: { allergeen: { volgorde: 'asc' as const } } }
const productInclude = {
  labels: { include: { label: true } },
  allergenenLijst: allergeenInclude,
  aanpassingen: { where: { actief: true }, orderBy: { volgorde: 'asc' as const } },
  opties: {
    orderBy: { volgorde: 'asc' as const },
    include: { keuzes: { where: { actief: true }, orderBy: { volgorde: 'asc' as const }, include: { allergenenLijst: allergeenInclude } } },
  },
}

export type MenuAllergeen = { id: string; naam: string; icoon: string | null; soort: 'BEVAT' | 'SPOREN' }

export type MenuProduct = {
  id: string
  naam: string
  slug: string
  omschrijving: string | null
  afbeelding: string | null
  prijsCent: number
  btwPct: number
  uitverkocht: boolean
  allergenenActief: boolean
  allergenen: string | null
  allergenenLijst: MenuAllergeen[]
  loyaltyPunten: number
  maxPerBestelling: number | null
  leeftijdsgrens: number | null
  beschikbaar: BeschikbaarRegels
  beschikbaarBadge: string | null
  labels: { naam: string; afbeelding: string | null; kleur: string }[]
  aanpassingenActief: boolean
  aanpassingenTitel: string
  aanpassingen: { id: string; naam: string; prijsCent: number }[]
  opties: { id: string; naam: string; verplicht: boolean; wijzigtAllergenen: boolean; keuzes: { id: string; naam: string; prijsCent: number; standaard: boolean; allergenenLijst: MenuAllergeen[] }[] }[]
}

export type MenuCategorie = { id: string; naam: string; slug: string; omschrijving: string | null; producten: MenuProduct[] }

type ProductMetRelaties = Awaited<ReturnType<typeof haalProducten>>[number]
function haalProducten(where: object) {
  return prisma.product.findMany({ where, include: productInclude, orderBy: [{ volgorde: 'asc' }, { naam: 'asc' }] })
}

function naarMA(a: { soort: 'BEVAT' | 'SPOREN'; allergeen: { id: string; naam: string; icoon: string | null } }): MenuAllergeen {
  return { id: a.allergeen.id, naam: a.allergeen.naam, icoon: a.allergeen.icoon, soort: a.soort }
}

export function naarMenuProduct(p: ProductMetRelaties): MenuProduct {
  return {
    id: p.id,
    naam: p.naam,
    slug: p.slug,
    omschrijving: p.omschrijving,
    afbeelding: p.afbeelding,
    prijsCent: productPrijsCent(p.prijsExcl, p.btwPct),
    btwPct: Number(p.btwPct),
    uitverkocht: isUitverkocht(p),
    allergenenActief: p.allergenenActief,
    allergenen: p.allergenen,
    allergenenLijst: p.allergenenLijst.map(naarMA),
    loyaltyPunten: p.loyaltyActief ? p.loyaltyPunten : 0,
    maxPerBestelling: p.maxPerBestelling,
    leeftijdsgrens: p.leeftijdsgrens,
    beschikbaar: regelsVan(p),
    beschikbaarBadge: beschikbaarBadge(regelsVan(p)),
    labels: [...p.labels].sort((a, b) => a.label.volgorde - b.label.volgorde).map(l => ({ naam: l.label.naam, afbeelding: l.label.afbeelding, kleur: l.label.kleur })),
    aanpassingenActief: p.aanpassingenActief,
    aanpassingenTitel: p.aanpassingenTitel,
    aanpassingen: p.aanpassingenActief ? p.aanpassingen.map(a => ({ id: a.id, naam: a.naam, prijsCent: a.prijsCent })) : [],
    opties: p.opties.filter(o => o.keuzes.length).map(o => ({
      id: o.id, naam: o.naam, verplicht: o.verplicht, wijzigtAllergenen: o.wijzigtAllergenen,
      keuzes: o.keuzes.map(k => ({ id: k.id, naam: k.naam, prijsCent: k.prijsCent, standaard: k.standaard, allergenenLijst: k.allergenenLijst.map(naarMA) })),
    })),
  }
}

export async function getMenu(): Promise<MenuCategorie[]> {
  const cats = await prisma.categorie.findMany({ where: { zichtbaar: true }, orderBy: [{ volgorde: 'asc' }, { naam: 'asc' }] })
  const vandaag = vandaagLokaal()
  const dagen = Array.from({ length: 15 }, (_, i) => datumPlus(vandaag, i))
  const producten = (await haalProducten({ zichtbaar: true, categorie: { zichtbaar: true } }))
    .filter(p => dagen.some(d => inSeizoen(regelsVan(p), d)))
  return cats
    .map(c => ({
      id: c.id, naam: c.naam, slug: c.slug, omschrijving: c.omschrijving,
      producten: producten.filter(p => p.categorieId === c.id).map(naarMenuProduct),
    }))
    .filter(c => c.producten.length)
}

export async function getProductVoorBestelling(id: string) {
  const p = await prisma.product.findUnique({ where: { id }, include: productInclude })
  if (!p || !p.zichtbaar) return null
  return { raw: p, menu: naarMenuProduct(p) }
}
