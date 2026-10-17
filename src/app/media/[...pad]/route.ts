import { readFile, stat } from 'fs/promises'
import path from 'path'
import { UPLOAD_DIR } from '@/lib/upload'

const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

export async function GET(_req: Request, { params }: { params: { pad: string[] } }) {
  const rel = params.pad.join('/')
  const vol = path.resolve(UPLOAD_DIR, rel)
  if (!vol.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return new Response('Niet gevonden', { status: 404 })
  const type = TYPES[path.extname(vol).toLowerCase()]
  if (!type) return new Response('Niet gevonden', { status: 404 })
  try {
    const [buf, st] = await Promise.all([readFile(vol), stat(vol)])
    return new Response(buf, {
      headers: { 'Content-Type': type, 'Content-Length': String(st.size), 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  } catch {
    return new Response('Niet gevonden', { status: 404 })
  }
}
