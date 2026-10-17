import { api, body, ok, vereisAdmin } from '@/lib/api'
import { klantenInGroep, type GroepFilters } from '@/lib/marketing'

// Hoeveel klanten vallen onder deze voorwaarden?
export const POST = api(async req => {
  await vereisAdmin()
  const { filters } = await body<{ filters?: GroepFilters }>(req)
  const k = await klantenInGroep(filters || {})
  return ok({ aantal: k.length, voorbeeld: k.slice(0, 8).map(x => `${x.voornaam} ${x.naam}`) })
})
