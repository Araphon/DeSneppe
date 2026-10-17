'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

// Doorzoekbare icoonkiezer (emoji) met Nederlandse trefwoorden, gericht op voeding en allergenen
const ICONEN: [string, string][] = [
  ['🌾', 'gluten tarwe graan rogge gerst haver spelt'], ['🍞', 'brood gluten tarwe'], ['🥖', 'stokbrood baguette gluten'], ['🥐', 'croissant boter gluten'], ['🥨', 'pretzel bretzel'], ['🫓', 'platbrood pita wrap'],
  ['🦐', 'garnaal schaaldieren scampi'], ['🦞', 'kreeft schaaldieren'], ['🦀', 'krab schaaldieren'], ['🦑', 'inktvis weekdieren calamares'], ['🐙', 'octopus weekdieren'], ['🦪', 'oester mossel weekdieren schelp'], ['🐚', 'schelp weekdieren'],
  ['🥚', 'ei eieren'], ['🍳', 'gebakken ei eieren'], ['🐟', 'vis'], ['🐠', 'vis'], ['🍣', 'sushi vis zalm'], ['🐡', 'vis'],
  ['🥜', 'pinda pindas noot'], ['🌰', 'noot noten kastanje hazelnoot'], ['🥥', 'kokos kokosnoot noot'], ['🫘', 'soja boon bonen peulvruchten'],
  ['🥛', 'melk lactose zuivel'], ['🧀', 'kaas melk zuivel lactose'], ['🧈', 'boter melk zuivel'], ['🍦', 'ijs melk zuivel'], ['🍼', 'melk'],
  ['🥬', 'selder sla bladgroente'], ['🥒', 'komkommer augurk'], ['🟡', 'mosterd geel'], ['🌭', 'mosterd hotdog worst'], ['⚪', 'sesam sesamzaad wit'], ['🍷', 'sulfiet wijn alcohol'], ['🍇', 'druif sulfiet'], ['🌼', 'lupine bloem'], ['🌸', 'bloem'],
  ['🥝', 'kiwi fruit'], ['🍓', 'aardbei fruit'], ['🍑', 'perzik fruit'], ['🍒', 'kers fruit'], ['🍎', 'appel fruit'], ['🍏', 'appel groen fruit'], ['🍐', 'peer fruit'], ['🍊', 'sinaasappel citrus fruit'], ['🍋', 'citroen citrus fruit'], ['🍌', 'banaan fruit'], ['🍍', 'ananas fruit'], ['🥭', 'mango fruit'], ['🍉', 'watermeloen fruit'], ['🍈', 'meloen fruit'], ['🫐', 'bosbes fruit'], ['🥑', 'avocado'],
  ['🍅', 'tomaat nachtschade'], ['🍆', 'aubergine nachtschade'], ['🥔', 'aardappel nachtschade'], ['🌶️', 'peper pikant chili paprika'], ['🫑', 'paprika'], ['🥕', 'wortel'], ['🧅', 'ui'], ['🧄', 'look knoflook'], ['🌽', 'mais'], ['🥦', 'broccoli'], ['🍄', 'champignon paddenstoel'], ['🫛', 'erwt peul'], ['🌿', 'kruiden koriander peterselie'], ['🍃', 'blad kruiden munt'],
  ['🍯', 'honing'], ['🍫', 'chocolade cacao'], ['🍬', 'snoep suiker'], ['🍭', 'snoep lolly'], ['🧂', 'zout'], ['🫚', 'gember'], ['☕', 'koffie cafeine'], ['🍵', 'thee'], ['🍺', 'bier alcohol gluten'], ['🥃', 'sterke drank alcohol'], ['🧃', 'sap'], ['🥤', 'frisdrank'],
  ['🥩', 'vlees rund'], ['🍗', 'kip gevogelte'], ['🥓', 'spek varken'], ['🐖', 'varken'], ['🐄', 'koe rund'], ['🐔', 'kip'], ['🐑', 'lam schaap'], ['🌱', 'vegan plantaardig kiem'], ['🥗', 'salade veggie'],
  ['⚠️', 'waarschuwing let op'], ['❗', 'uitroepteken let op'], ['🚫', 'verboden geen'], ['✅', 'ok vrij'], ['❌', 'kruis niet'], ['🔴', 'rood'], ['🟠', 'oranje'], ['🟢', 'groen'], ['🔵', 'blauw'], ['🟣', 'paars'], ['⚫', 'zwart'], ['🟤', 'bruin'],
]

export default function EmojiKiezer({ waarde, onChange }: { waarde: string | null; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false)
  const [zoek, setZoek] = useState('')
  const vak = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const klik = (e: MouseEvent) => { if (vak.current && !vak.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', klik)
    return () => document.removeEventListener('mousedown', klik)
  }, [open])
  const lijst = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    return q ? ICONEN.filter(([, t]) => t.split(' ').some(w => w.startsWith(q)) || t.includes(q)) : ICONEN
  }, [zoek])
  return (
    <div className="block" ref={vak}>
      <button type="button" onClick={() => setOpen(v => !v)} className="flex h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 hover:border-ink" aria-label="Icoon kiezen">
        <span className="text-2xl">{waarde || '＋'}</span><span className="text-sm text-ink/60">{waarde ? 'Wijzigen' : 'Kies icoon'}</span>
      </button>
      {open && (
        <div className="mt-2 w-full max-w-sm rounded-xl bg-white p-3 shadow-card ring-1 ring-ink/10">
          <input autoFocus className="input mb-2 py-2 text-sm" placeholder="Zoek: noot, vis, kiwi…" value={zoek} onChange={e => setZoek(e.target.value)} />
          <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
            {lijst.map(([e, t]) => (
              <button key={e} type="button" title={t.split(' ')[0]} onClick={() => { onChange(e); setOpen(false); setZoek('') }} className={`grid h-8 w-8 place-items-center rounded-md text-xl hover:bg-sand ${waarde === e ? 'bg-sand ring-1 ring-ink' : ''}`}>{e}</button>
            ))}
            {!lijst.length && <p className="col-span-8 py-4 text-center text-xs text-ink/50">Niets gevonden</p>}
          </div>
          {waarde && <button type="button" className="mt-2 text-xs text-ink/60 underline" onClick={() => { onChange(''); setOpen(false) }}>Geen icoon</button>}
        </div>
      )}
    </div>
  )
}
