// Importeert het huidige Unipage-aanbod van De Sneppe + standaardlabels + openingsuren.
// Idempotent: producten worden gematcht op `extern` (Unipage-id) en niet overschreven als ze al bestaan.
import { PrismaClient } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { bewaarAfbeelding } from '../src/lib/upload'
import { slugify } from '../src/lib/slug'
import sharp from 'sharp'
import { EU_ALLERGENEN } from '../src/lib/allergenen'

const prisma = new PrismaClient()
const IMPORT = path.join(__dirname, 'import')
const BTW = 6

type UniItem = {
  id: string
  reference: string
  order: number
  category_id: string
  is_available: number
  in_stock: boolean
  has_addons: boolean
  translations: { locale: string; name: string; description: string | null }[]
  prices: { value: number }[]
}
type UniAddon = {
  reference: string
  type: 'CHECKBOX' | 'RADIO'
  options: { reference: string; order: number; is_available: boolean; prices: { value: number }[] }[]
}

function labelSvg(kleur: string, inhoud: string) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="62" fill="${kleur}"/>${inhoud}</svg>`)
}
const blad = '<path d="M36 92C36 58 60 36 96 32c-2 36-26 60-60 60z" fill="#fff"/><path d="M40 90c14-18 28-30 44-40" stroke="#65a30d" stroke-width="5" fill="none" stroke-linecap="round"/>'
const LABELS: { naam: string; kleur: string; svg: string }[] = [
  { naam: 'Vegan', kleur: '#15803d', svg: '<text x="64" y="78" font-family="DejaVu Sans, Arial" font-weight="700" font-size="40" fill="#fff" text-anchor="middle">VG</text>' },
  { naam: 'Veggie', kleur: '#65a30d', svg: blad },
  { naam: 'Glutenvrij', kleur: '#d97706', svg: '<text x="64" y="78" font-family="DejaVu Sans, Arial" font-weight="700" font-size="40" fill="#fff" text-anchor="middle">GF</text>' },
  { naam: 'Nieuw', kleur: '#2563eb', svg: '<polygon points="64,22 75,50 106,52 82,72 90,102 64,85 38,102 46,72 22,52 53,50" fill="#fff"/>' },
  { naam: 'Hot', kleur: '#dc2626', svg: '<path d="M44 46c6-4 14-2 16 4 4 14 14 30 34 40 4 2 2 8-2 8-30 0-52-20-54-40-1-6 2-10 6-12z" fill="#fff"/><path d="M58 44c0-8 6-14 14-14" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>' },
]

async function main() {
  // ── Labels
  const labelIds: Record<string, string> = {}
  for (const [i, l] of LABELS.entries()) {
    let bestaand = await prisma.label.findUnique({ where: { naam: l.naam } })
    if (!bestaand) {
      const png = await sharp(labelSvg(l.kleur, l.svg)).png().toBuffer()
      const afbeelding = await bewaarAfbeelding(png, 'labels', { png: true, vierkant: 128 })
      bestaand = await prisma.label.create({ data: { naam: l.naam, kleur: l.kleur, afbeelding, volgorde: i } })
    }
    labelIds[l.naam] = bestaand.id
  }
  console.log('Labels ok')

  // ── Wettelijke allergenen
  for (const [i, a] of EU_ALLERGENEN.entries()) {
    await prisma.allergeen.upsert({ where: { naam: a.naam }, create: { naam: a.naam, icoon: a.icoon, wettelijk: true, volgorde: i }, update: {} })
  }

  // ── Openingsuren (ma–vr 06:00–14:00)
  if ((await prisma.openingsRegel.count()) === 0) {
    await prisma.openingsRegel.create({
      data: {
        type: 'OPEN', titel: 'Weekschema', startDatum: new Date('2026-01-05T00:00:00Z'),
        startTijd: '06:00', eindTijd: '14:00', herhaling: 'WEKELIJKS', interval: 1, weekdagen: [1, 2, 3, 4, 5],
      },
    })
    console.log('Openingsuren ok')
  }

  // ── Catalogus
  const menu = JSON.parse(readFileSync(path.join(IMPORT, 'unipage-menu.json'), 'utf8')).props.menu.business
  const catMap: Record<string, string> = {}
  for (const c of menu.categories as { id: string; reference: string; order: number }[]) {
    const naam = c.reference === c.reference.toUpperCase() ? c.reference.charAt(0) + c.reference.slice(1).toLowerCase() : c.reference
    const slug = slugify(naam)
    const cat = await prisma.categorie.upsert({
      where: { slug },
      create: { naam, slug, volgorde: c.order },
      update: {},
    })
    catMap[c.id] = cat.id
  }
  console.log('Categorieën ok:', Object.keys(catMap).length)

  const gebruikteSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map(p => p.slug))
  let nieuw = 0
  for (const it of menu.items as UniItem[]) {
    if (await prisma.product.findUnique({ where: { extern: `unipage:${it.id}` } })) continue
    const nl = it.translations.find(t => t.locale === 'NL')
    const naam = (nl?.name || it.reference).trim()
    let slug = slugify(naam)
    for (let n = 2; gebruikteSlugs.has(slug); n++) slug = `${slugify(naam)}-${n}`
    gebruikteSlugs.add(slug)

    const incl = it.prices[0]?.value ?? 0
    const prijsExcl = Math.round((incl / (1 + BTW / 100)) * 10000) / 10000

    let afbeelding: string | null = null
    const foto = path.join(IMPORT, 'foto', `${it.id}.jpg`)
    if (existsSync(foto)) afbeelding = await bewaarAfbeelding(readFileSync(foto), 'producten', { vierkant: 800 })

    let addons: UniAddon[] = []
    const det = path.join(IMPORT, 'items', `${it.id}.json`)
    if (it.has_addons && existsSync(det)) addons = JSON.parse(readFileSync(det, 'utf8')).item.addons || []
    const checkbox = addons.filter(a => a.type === 'CHECKBOX')
    const radio = addons.filter(a => a.type === 'RADIO')
    const cent = (o: { prices: { value: number }[] }) => Math.round((o.prices[0]?.value ?? 0) * 100)
    const netjes = (s: string) => { const t = s.replace(/\s+/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1) }

    const lager = naam.toLowerCase()
    const labels: string[] = []
    if (/pikant|tabasco|\bhot\b/.test(lager)) labels.push('Hot')
    if (/superveggie/.test(lager)) labels.push('Veggie')

    await prisma.product.create({
      data: {
        extern: `unipage:${it.id}`,
        naam, slug,
        omschrijving: nl?.description?.trim() || null,
        afbeelding,
        prijsExcl, btwPct: BTW,
        categorieId: catMap[it.category_id],
        volgorde: it.order,
        zichtbaar: true,
        uitverkocht: !it.is_available || !it.in_stock,
        aanpassingenActief: checkbox.length > 0,
        aanpassingenTitel: checkbox[0]?.reference || 'Aanpassingen',
        aanpassingen: {
          create: checkbox.flatMap(a => a.options).map((o, i) => ({ naam: netjes(o.reference), prijsCent: cent(o), volgorde: i, actief: o.is_available })),
        },
        opties: {
          create: radio.map((a, i) => ({
            naam: netjes(a.reference), verplicht: true, volgorde: i,
            keuzes: { create: a.options.map((o, j) => ({ naam: netjes(o.reference), prijsCent: cent(o), volgorde: j, standaard: j === 0, actief: o.is_available })) },
          })),
        },
        labels: { create: labels.map(l => ({ labelId: labelIds[l] })) },
      },
    })
    nieuw++
  }
  console.log('Producten geïmporteerd:', nieuw)
}

main().then(() => prisma.$disconnect()).catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
