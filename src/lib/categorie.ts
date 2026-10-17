import { prisma } from './db'
import { slugify } from './slug'

export async function uniekeCatSlug(naam: string, eigenId?: string) {
  const basis = slugify(naam)
  for (let n = 1; ; n++) {
    const s = n === 1 ? basis : `${basis}-${n}`
    const b = await prisma.categorie.findUnique({ where: { slug: s } })
    if (!b || b.id === eigenId) return s
  }
}
