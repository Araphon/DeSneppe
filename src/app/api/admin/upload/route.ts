import { api, body, fout, ok, vereisAdmin } from '@/lib/api'
import { bewaarAfbeelding, dataUrlNaarBuffer } from '@/lib/upload'

export const POST = api(async req => {
  await vereisAdmin()
  const { dataUrl, map } = await body<{ dataUrl?: string; map?: string }>(req)
  const buf = dataUrlNaarBuffer(String(dataUrl || ''))
  if (!buf) return fout('Ongeldige afbeelding.')
  const m = (['producten', 'labels', 'beloningen', 'site'] as const).find(x => x === map) || 'producten'
  const png = m === 'labels'
  const pad = await bewaarAfbeelding(buf, m, { vierkant: png ? 256 : 800, png })
  return ok({ pad })
})
