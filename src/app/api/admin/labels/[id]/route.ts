import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'

export const PUT = api(async (req, { params }) => {
  await vereisAdmin()
  const { naam, afbeelding, kleur } = await body<{ naam?: string; afbeelding?: string; kleur?: string }>(req)
  if (!naam?.trim()) return fout('Naam is verplicht.')
  const dubbel = await prisma.label.findUnique({ where: { naam: naam.trim() } })
  if (dubbel && dubbel.id !== params.id) return fout('Er bestaat al een label met deze naam.')
  return ok(await prisma.label.update({ where: { id: params.id }, data: { naam: naam.trim(), afbeelding: afbeelding || null, kleur: kleur || '#16a34a' } }))
})

export const DELETE = api(async (_req, { params }) => {
  await vereisAdmin()
  await prisma.label.delete({ where: { id: params.id } })
  return ok({ ok: true })
})
