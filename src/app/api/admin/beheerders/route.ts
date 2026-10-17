import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { nodigUit } from '@/lib/beheerders'

export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  const ik = await vereisAdmin()
  const lijst = await prisma.adminGebruiker.findMany({ orderBy: { aangemaaktOp: 'asc' } })
  return ok(lijst.map(a => ({
    id: a.id, naam: a.naam, email: a.email, actief: a.actief, laatsteLogin: a.laatsteLogin, aangemaaktOp: a.aangemaaktOp,
    uitgenodigd: !a.wachtwoord, uitnodigingVerlopen: !a.wachtwoord && (!a.uitnodigTot || a.uitnodigTot < new Date()), ikZelf: a.id === ik.id,
  })))
})

// Nieuwe beheerder uitnodigen: { naam, email }
export const POST = api(async req => {
  const ik = await vereisAdmin()
  const { naam, email } = await body<{ naam?: string; email?: string }>(req)
  const e = String(email || '').trim().toLowerCase()
  if (!naam?.trim() || !/^\S+@\S+\.\S+$/.test(e)) return fout('Vul een naam en een geldig e-mailadres in.')
  if (await prisma.adminGebruiker.findUnique({ where: { email: e } })) return fout('Er bestaat al een beheerder met dit e-mailadres.')
  const a = await prisma.adminGebruiker.create({ data: { naam: naam.trim(), email: e } })
  return ok(await nodigUit(a.id, ik.naam))
})
