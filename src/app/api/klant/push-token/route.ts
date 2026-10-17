import { api, body, fout, ok, vereisKlant } from '@/lib/api'
import { prisma } from '@/lib/db'

// Toestel van de app koppelen aan het account (token van FCM of APNs)
export const POST = api(async req => {
  const klant = await vereisKlant()
  const b = await body<{ token?: string; platform?: string }>(req)
  const token = String(b.token || '').trim()
  const platform = b.platform === 'ios' ? 'ios' : b.platform === 'android' ? 'android' : null
  if (!token || token.length > 4096 || !platform) return fout('Ongeldig toestel')
  await prisma.pushAbonnement.upsert({
    where: { endpoint: token },
    create: { klantId: klant.id, endpoint: token, data: { platform } },
    update: { klantId: klant.id, data: { platform } },
  })
  return ok({ ok: true })
})

// Bij afmelden in de app: dit toestel krijgt geen berichten meer
export const DELETE = api(async req => {
  const klant = await vereisKlant()
  const b = await body<{ token?: string }>(req)
  if (b.token) await prisma.pushAbonnement.deleteMany({ where: { endpoint: String(b.token), klantId: klant.id } })
  return ok({ ok: true })
})
