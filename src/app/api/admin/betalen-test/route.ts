import { api, fout, ok, vereisAdmin } from '@/lib/api'
import { mollie } from '@/lib/mollie'

// Verbinding met Mollie testen: geeft de actieve betaalmethodes terug
export const POST = api(async () => {
  await vereisAdmin()
  const m = await mollie()
  if (!m) return fout('Er is nog geen Mollie API-sleutel ingevuld (of nog niet opgeslagen).')
  try {
    const methodes = await m.methods.list()
    return ok({ methodes: methodes.map(x => x.description) })
  } catch (e) {
    return fout(`Mollie weigert de verbinding: ${(e as Error).message}`)
  }
})
