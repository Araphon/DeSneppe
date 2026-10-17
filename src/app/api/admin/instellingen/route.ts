import { api, body, ok, vereisAdmin } from '@/lib/api'
import { STANDAARD, getInstellingen, maskeerSleutel, setInstelling, type Instellingen } from '@/lib/instellingen'
import { isGeldigeSleutel } from '@/lib/mollie'
import { fout } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
// De Mollie-sleutel gaat nooit volledig naar de browser
async function veilig() {
  const i = await getInstellingen()
  return { ...i, betalen: { ...i.betalen, mollieApiKey: maskeerSleutel(i.betalen.mollieApiKey) } }
}

export const GET = api(async () => { await vereisAdmin(); return ok(await veilig()) })

export const PUT = api(async req => {
  await vereisAdmin()
  const d = await body<Partial<Instellingen>>(req)
  if (d.betalen) {
    const k = String(d.betalen.mollieApiKey ?? '').trim()
    if (k.includes('•')) delete (d.betalen as Partial<Instellingen['betalen']>).mollieApiKey // ongewijzigd laten
    else if (k && !isGeldigeSleutel(k)) return fout('Ongeldige Mollie API-sleutel. Die begint met test_ of live_.')
    else d.betalen.mollieApiKey = k
    if (d.betalen.onlineActief && !k && !(await getInstellingen()).betalen.mollieApiKey) return fout('Vul eerst een Mollie API-sleutel in om online betalen aan te zetten.')
    if (d.betalen.onlineActief === false && d.betalen.aanKassaActief === false) return fout('Minstens één betaalwijze moet aan staan.')
    const huidig = (await getInstellingen()).betalen
    const vanaf = Number(d.betalen.onlineVanafCent ?? huidig.onlineVanafCent)
    const kassa = d.betalen.aanKassaActief ?? huidig.aanKassaActief
    if (vanaf > 0 && !kassa) return fout('Als online betalen pas vanaf een bedrag kan, moet “Betalen bij afhalen” aan staan — anders kunnen kleine bestellingen niet meer.')
  }
  for (const k of Object.keys(STANDAARD) as (keyof Instellingen)[]) {
    if (d[k] === undefined) continue
    const def = STANDAARD[k]
    if (typeof def === 'object') {
      // enkel gekende velden, met het juiste type
      const schoon: Record<string, unknown> = {}
      for (const [veld, standaard] of Object.entries(def)) {
        const v = (d[k] as Record<string, unknown>)[veld]
        if (v === undefined) continue
        if (typeof standaard === 'number') { const n = Number(v); if (Number.isFinite(n)) schoon[veld] = n }
        else if (typeof standaard === 'boolean') schoon[veld] = Boolean(v)
        else schoon[veld] = String(v).slice(0, 2000)
      }
      const huidig = (await getInstellingen())[k] as object
      await setInstelling(k, { ...huidig, ...schoon } as never)
    } else if (typeof def === 'number' && Number.isFinite(Number(d[k]))) {
      await setInstelling(k, Number(d[k]) as never)
    }
  }
  revalidatePath('/', 'layout')
  return ok(await veilig())
})
