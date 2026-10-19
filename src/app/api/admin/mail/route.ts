import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { mailStatus, stuurTestMail } from '@/lib/mail'

export const dynamic = 'force-dynamic'

export const GET = api(async () => { await vereisAdmin(); return ok(mailStatus()) })

// POST { aan } → testmail
export const POST = api(async req => {
  const a = await vereisAdmin()
  const { aan } = await body<{ aan?: string }>(req)
  const naar = String(aan || a.email).trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(naar)) return fout('Ongeldig e-mailadres')
  const r = await stuurTestMail(naar)
  return r.ok ? ok({ ok: true, aan: naar }) : fout(r.fout || 'Mislukt')
})
