import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { uniekeCatSlug } from '@/lib/categorie'

export const PUT = api(async (req, { params }) => {
  await vereisAdmin()
  const { naam, omschrijving, zichtbaar } = await body<{ naam?: string; omschrijving?: string; zichtbaar?: boolean }>(req)
  if (!naam?.trim()) return fout('Naam is verplicht.')
  const c = await prisma.categorie.update({
    where: { id: params.id },
    data: { naam: naam.trim(), omschrijving: omschrijving?.trim() || null, zichtbaar: zichtbaar !== false, slug: await uniekeCatSlug(naam, params.id) },
  })
  return ok(c)
})

// Verwijderen. Als er nog producten in zitten: actie 'verplaatsen' (naarId) of 'verwijderen'
export const DELETE = api(async (req, { params }) => {
  await vereisAdmin()
  const { actie, naarId } = await body<{ actie?: string; naarId?: string }>(req)
  const aantal = await prisma.product.count({ where: { categorieId: params.id } })
  if (aantal > 0) {
    if (actie === 'verplaatsen') {
      if (!naarId || naarId === params.id || !(await prisma.categorie.findUnique({ where: { id: naarId } }))) return fout('Kies een andere categorie.')
      await prisma.product.updateMany({ where: { categorieId: params.id }, data: { categorieId: naarId } })
    } else if (actie === 'verwijderen') {
      await prisma.product.deleteMany({ where: { categorieId: params.id } })
    } else return fout('Deze categorie bevat nog producten.', 409)
  }
  await prisma.categorie.delete({ where: { id: params.id } })
  return ok({ ok: true })
})
