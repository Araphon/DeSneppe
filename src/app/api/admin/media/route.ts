import { readdir, stat } from 'fs/promises'
import path from 'path'
import { api, ok, vereisAdmin } from '@/lib/api'
import { UPLOAD_DIR } from '@/lib/upload'

export const dynamic = 'force-dynamic'

// Eigen foto's van de website (uploads/site), nieuwste eerst — voor de fotokiezer in het beheer
export const GET = api(async () => {
  await vereisAdmin()
  const map = path.join(UPLOAD_DIR, 'site')
  const namen = await readdir(map).catch(() => [] as string[])
  const fotos = await Promise.all(namen.filter(n => /\.(jpe?g|png|webp)$/i.test(n)).map(async n => ({ src: `/media/site/${n}`, naam: n.replace(/\.[a-z]+$/i, '').replace(/-/g, ' '), t: (await stat(path.join(map, n))).mtimeMs })))
  return ok(fotos.sort((a, b) => b.t - a.t).map(({ src, naam }) => ({ src, naam })))
})
