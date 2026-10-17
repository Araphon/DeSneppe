import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { aantalActieveBeheerders, nodigUit } from '@/lib/beheerders'

// { actief } of { opnieuwUitnodigen: true } of { naam }
export const PUT = api(async (req, { params }) => {
  const ik = await vereisAdmin()
  const d = await body<{ actief?: boolean; opnieuwUitnodigen?: boolean; naam?: string }>(req)
  const a = await prisma.adminGebruiker.findUnique({ where: { id: params.id } })
  if (!a) return fout('Niet gevonden', 404)
  if (d.opnieuwUitnodigen) {
    if (a.wachtwoord) return fout('Deze beheerder heeft al een wachtwoord.')
    return ok(await nodigUit(a.id, ik.naam))
  }
  if (d.actief === false) {
    if (a.id === ik.id) return fout('Je kan jezelf niet deactiveren.')
    if (a.actief && a.wachtwoord && (await aantalActieveBeheerders()) <= 1) return fout('Er moet minstens één actieve beheerder overblijven.')
  }
  await prisma.adminGebruiker.update({
    where: { id: a.id },
    data: { ...(typeof d.actief === 'boolean' ? { actief: d.actief } : {}), ...(d.naam?.trim() ? { naam: d.naam.trim() } : {}) },
  })
  return ok({ ok: true })
})

export const DELETE = api(async (_req, { params }) => {
  const ik = await vereisAdmin()
  const a = await prisma.adminGebruiker.findUnique({ where: { id: params.id } })
  if (!a) return fout('Niet gevonden', 404)
  if (a.id === ik.id) return fout('Je kan jezelf niet verwijderen.')
  if (a.actief && a.wachtwoord && (await aantalActieveBeheerders()) <= 1) return fout('Er moet minstens één actieve beheerder overblijven.')
  await prisma.adminGebruiker.delete({ where: { id: a.id } })
  return ok({ ok: true })
})
