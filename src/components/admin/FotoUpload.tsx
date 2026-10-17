'use client'
import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import Modal from '../Modal'
import { vraag } from '../fetcher'

async function snijBij(src: string, area: Area, uit: number, png: boolean): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new window.Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
  const c = document.createElement('canvas')
  c.width = uit; c.height = uit
  const ctx = c.getContext('2d')!
  if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, uit, uit) }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, uit, uit)
  // JPEG 800px ≈ 100–250 kB → blijft ruim onder de 1 MB-limiet van nginx
  return png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.86)
}

export default function FotoUpload({ waarde, onChange, map = 'producten', grootte = 160, rond = false }: { waarde: string | null; onChange: (pad: string | null) => void; map?: 'producten' | 'labels' | 'beloningen' | 'site'; grootte?: number; rond?: boolean }) {
  const [bron, setBron] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const png = map === 'labels'
  const onComplete = useCallback((_: Area, px: Area) => setArea(px), [])

  return (
    <div>
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => input.current?.click()} className={`relative grid shrink-0 place-items-center overflow-hidden border-2 border-dashed border-ink/20 bg-sand/50 text-ink/40 hover:border-brand ${rond ? 'rounded-full' : 'rounded-2xl'}`} style={{ width: grootte, height: grootte }} aria-label="Foto kiezen">
          {waarde ? <Image src={waarde} alt="" fill sizes={`${grootte}px`} className="object-cover" /> : <span className="text-center text-sm">📷<br />Foto kiezen</span>}
        </button>
        <div className="space-y-2 text-sm">
          <button type="button" className="btn-ghost btn-sm" onClick={() => input.current?.click()}>{waarde ? 'Andere foto' : 'Foto uploaden'}</button>
          {waarde && <button type="button" className="block text-red-600 underline" onClick={() => onChange(null)}>Verwijderen</button>}
          <p className="text-ink/50">{png ? 'PNG met transparante achtergrond' : 'Wordt vierkant (1:1) bijgesneden'}</p>
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => {
        const f = e.target.files?.[0]; e.target.value = ''
        if (!f) return
        const r = new FileReader(); r.onload = () => { setBron(String(r.result)); setZoom(1); setCrop({ x: 0, y: 0 }) }; r.readAsDataURL(f)
      }} />
      {fout && <p className="mt-2 text-sm text-red-600">{fout}</p>}
      {bron && (
        <Modal titel="Foto bijsnijden" onSluit={() => setBron(null)}>
          <div className="relative h-80 overflow-hidden rounded-2xl bg-ink">
            <Cropper image={bron} crop={crop} zoom={zoom} aspect={1} cropShape={rond ? 'round' : 'rect'} showGrid onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onComplete} />
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm">Zoom<input type="range" min={1} max={4} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-brand" /></label>
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setBron(null)}>Annuleren</button>
            <button className="btn-brand" disabled={!area || bezig} onClick={async () => {
              if (!area) return
              setBezig(true); setFout('')
              try {
                const dataUrl = await snijBij(bron, area, png ? 256 : 800, png)
                const r = await vraag<{ pad: string }>('/api/admin/upload', 'POST', { dataUrl, map })
                onChange(r.pad); setBron(null)
              } catch (e) { setFout((e as Error).message) } finally { setBezig(false) }
            }}>{bezig ? 'Uploaden…' : 'Bijsnijden & opslaan'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
