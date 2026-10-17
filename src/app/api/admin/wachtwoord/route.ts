import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { rateLimit } from '@/lib/auth'

export const PUT = api(async req => {
  const ik = await vereisAdmin()
  const { huidig, nieuw } = await body<{ huidig?: string; nieuw?: string }>(req)
  if (!rateLimit('aww:' + ik.id, 6)) return fout('Te veel pogingen. Probeer later opnieuw.', 429)
  if (!ik.wachtwoord || !(await bcrypt.compare(String(huidig || ''), ik.wachtwoord))) return fout('Je huidige wachtwoord klopt niet.')
  if (String(nieuw || '').length < 10) return fout('Kies een nieuw wachtwoord van minstens 10 tekens.')
  await prisma.adminGebruiker.update({ where: { id: ik.id }, data: { wachtwoord: await bcrypt.hash(String(nieuw), 10) } })
  return ok({ ok: true })
})
