import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

// Bewaart een (al bijgesneden) afbeelding als JPG/PNG en geeft het publieke pad terug (/media/...)
export async function bewaarAfbeelding(data: Buffer, map: 'producten' | 'labels' | 'beloningen' | 'site', opties: { vierkant?: number; png?: boolean } = {}) {
  const dir = path.join(UPLOAD_DIR, map)
  await mkdir(dir, { recursive: true })
  const naam = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`
  let img = sharp(data).rotate()
  if (opties.vierkant) img = img.resize(opties.vierkant, opties.vierkant, { fit: 'cover' })
  const ext = opties.png ? 'png' : 'jpg'
  const buf = opties.png ? await img.png().toBuffer() : await img.jpeg({ quality: 84, mozjpeg: true }).toBuffer()
  await writeFile(path.join(dir, `${naam}.${ext}`), buf)
  return `/media/${map}/${naam}.${ext}`
}

export function dataUrlNaarBuffer(dataUrl: string): Buffer | null {
  const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(dataUrl)
  return m ? Buffer.from(m[2], 'base64') : null
}
