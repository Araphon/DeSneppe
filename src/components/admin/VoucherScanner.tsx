'use client'
import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { vraag } from '../fetcher'

type Info = { code: string; status: string; punten: number; beloning: string; klant: string; klantPunten: number; ingewisseldOp: string | null }

export default function VoucherScanner() {
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [camera, setCamera] = useState(false)
  const [code, setCode] = useState('')
  const [info, setInfo] = useState<Info | null>(null)
  const [fout, setFout] = useState('')
  const [klaar, setKlaar] = useState(false)

  async function zoek(c: string) {
    setFout(''); setKlaar(false)
    try { setInfo(await vraag<Info>('/api/admin/vouchers', 'POST', { code: c })) } catch (e) { setInfo(null); setFout((e as Error).message) }
  }

  useEffect(() => {
    if (!camera) return
    let stream: MediaStream | null = null
    let raf = 0
    let stop = false
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (!video.current) return
        video.current.srcObject = stream
        await video.current.play()
        const tick = () => {
          if (stop || !video.current || !canvas.current) return
          const v = video.current
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            const c = canvas.current; c.width = v.videoWidth; c.height = v.videoHeight
            const ctx = c.getContext('2d', { willReadFrequently: true })!
            ctx.drawImage(v, 0, 0, c.width, c.height)
            const img = ctx.getImageData(0, 0, c.width, c.height)
            const r = jsQR(img.data, img.width, img.height)
            if (r?.data) { setCode(r.data); setCamera(false); zoek(r.data); return }
          }
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch { setFout('Camera niet beschikbaar. Typ de code manueel in.'); setCamera(false) }
    })()
    return () => { stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()) }
  }, [camera])

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg font-bold">Voucher scannen</h2>
      <p className="text-sm text-ink/60">Scan de QR-code op de gsm van de klant. Pas na bevestiging gaan de punten van de teller.</p>
      {camera ? (
        <div className="mt-4">
          <video ref={video} className="w-full rounded-2xl bg-ink" playsInline muted />
          <button className="btn-ghost btn-sm mt-2" onClick={() => setCamera(false)}>Stoppen</button>
        </div>
      ) : <button className="btn-brand mt-4 w-full py-3" onClick={() => { setInfo(null); setFout(''); setCamera(true) }}>📷 Scan QR-code</button>}
      <canvas ref={canvas} className="hidden" />
      <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); if (code.trim()) zoek(code.trim()) }}>
        <input className="input font-mono uppercase" placeholder="Of typ de code: SN-…" value={code} onChange={e => setCode(e.target.value)} />
        <button className="btn-ghost">Zoek</button>
      </form>
      {fout && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{fout}</p>}
      {info && (
        <div className={`mt-4 rounded-2xl p-4 ${info.status === 'OPEN' ? 'bg-emerald-50' : 'bg-sand'}`}>
          <p className="text-sm text-ink/60">{info.klant} · {info.klantPunten} punten</p>
          <p className="font-display text-2xl font-bold">🎁 {info.beloning}</p>
          <p className="text-sm">{info.punten} punten · <span className="font-mono">{info.code}</span></p>
          {info.status === 'OPEN' && !klaar && (
            <button className="btn mt-3 w-full bg-emerald-600 py-3 text-white hover:bg-emerald-700" onClick={async () => {
              try { setInfo(await vraag<Info>('/api/admin/vouchers', 'POST', { code: info.code, inwisselen: true })); setKlaar(true) } catch (e) { setFout((e as Error).message) }
            }}>Inwisselen ({info.punten} punten aftrekken)</button>
          )}
          {klaar && <p className="mt-3 font-semibold text-emerald-800">✓ Ingewisseld! Nieuw saldo: {info.klantPunten} punten. Geef de klant zijn beloning.</p>}
          {info.status === 'INGEWISSELD' && !klaar && <p className="mt-3 font-semibold text-red-700">Deze voucher werd al ingewisseld{info.ingewisseldOp ? ` op ${new Date(info.ingewisseldOp).toLocaleString('nl-BE', { timeZone: 'Europe/Brussels' })}` : ''}.</p>}
          {info.status === 'GEANNULEERD' && <p className="mt-3 font-semibold text-red-700">Deze voucher is niet meer geldig.</p>}
        </div>
      )}
    </div>
  )
}
