'use client'
import { useEffect, useState } from 'react'
import { vraag } from '../fetcher'
import PauzeModal from './PauzeModal'

export default function PauzeKnop() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<{ actief: boolean; dicht: number }>({ actief: true, dicht: 0 })
  const laad = () => vraag<{ bestellenActief: boolean; slots: { geblokkeerd: boolean; voorbij: boolean }[] }>('/api/admin/pauze')
    .then(d => setStatus({ actief: d.bestellenActief, dicht: d.slots.filter(s => s.geblokkeerd && !s.voorbij).length })).catch(() => {})
  useEffect(() => { laad() }, [])
  return (
    <>
      <button onClick={() => setOpen(true)} className={!status.actief ? 'btn bg-red-600 text-white' : status.dicht ? 'btn bg-mustard' : 'btn-ghost'}>
        {!status.actief ? '⏸ Bestellen gepauzeerd' : status.dicht ? `⛔ ${status.dicht} kwartier dicht` : '⏸ Pauze / blokkeren'}
      </button>
      {open && <PauzeModal onSluit={() => setOpen(false)} onGewijzigd={laad} />}
    </>
  )
}
