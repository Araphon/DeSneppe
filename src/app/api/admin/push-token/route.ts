import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { prisma } from '@/lib/db'

// Kassa-app: toestel koppelen aan de aangemelde beheerder (pushmeldingen bij nieuwe bestellingen)
export const POST = api(async req => {
  const a = await vereisAdmin()
  const b = await body<{ token?: string; platform?: string }>(req)
  const token = String(b.token || '').trim()
  const platform = b.platform === 'ios' ? 'ios' : b.platform === 'android' ? 'android' : null
  if (!token || token.length > 4096 || !platform) return fout('Ongeldig toestel')
  await prisma.adminToestel.upsert({
    where: { token },
    create: { adminId: a.id, token, platform },
    update: { adminId: a.id, platform, laatstGezien: new Date() },
  })
  return ok({ ok: true })
})

// Afmelden op de kassa: dit toestel krijgt geen meldingen meer
export const DELETE = api(async req => {
  const a = await vereisAdmin()
  const b = await body<{ token?: string }>(req)
  if (b.token) await prisma.adminToestel.deleteMany({ where: { token: String(b.token), adminId: a.id } })
  return ok({ ok: true })
})
