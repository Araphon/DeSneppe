import { prisma } from '@/lib/db'
import { api, body, fout, ok } from '@/lib/api'
import { leesAfmeldToken } from '@/lib/marketing'

async function afmelden(t: string) {
  const d = leesAfmeldToken(t)
  if (!d) return null
  const [k, o] = await Promise.all([prisma.klant.findUnique({ where: { id: d.klantId } }), prisma.meldingOnderwerp.findUnique({ where: { id: d.onderwerpId } })])
  if (!k || !o) return null
  await prisma.klantVoorkeur.upsert({ where: { klantId_onderwerpId: { klantId: k.id, onderwerpId: o.id } }, create: { klantId: k.id, onderwerpId: o.id, mail: false, push: false }, update: { mail: false } })
  return { onderwerp: o.naam, email: k.email }
}

// POST { t } (pagina) of POST ?t=…&oneclick=1 (List-Unsubscribe-Post vanuit de mailapp)
export const POST = api(async req => {
  const u = new URL(req.url)
  const t = u.searchParams.get('t') || (await body<{ t?: string }>(req)).t || ''
  const r = await afmelden(t)
  return r ? ok(r) : fout('Deze afmeldlink is ongeldig.', 400)
})
