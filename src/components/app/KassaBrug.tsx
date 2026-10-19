'use client'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { SneppePrinter, kanRuwPrinten } from './printer'

// Enkel in de De Sneppe Kassa-app: scherm wakker houden en pushmeldingen bij nieuwe bestellingen.
export default function KassaBrug() {
  const [melding, setMelding] = useState<'vragen' | 'uit' | null>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (kanRuwPrinten()) SneppePrinter.keepAwake({ aan: true }).catch(() => {})
    let opruimen: (() => void) | null = null
    ;(async () => {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      const r1 = await PushNotifications.addListener('registration', t => {
        fetch('/api/admin/push-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t.value, platform: Capacitor.getPlatform() }) }).catch(() => {})
      })
      const r2 = await PushNotifications.addListener('pushNotificationActionPerformed', () => { if (location.pathname !== '/kassa') location.href = '/kassa' })
      opruimen = () => { r1.remove(); r2.remove() }
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({ id: 'nieuwe-bestellingen', name: 'Nieuwe bestellingen', description: 'Melding bij elke nieuwe bestelling', importance: 5, visibility: 1, vibration: true, sound: 'default' }).catch(() => {})
      }
      const p = await PushNotifications.checkPermissions()
      if (p.receive === 'granted') await PushNotifications.register()
      else setMelding(p.receive === 'denied' ? 'uit' : 'vragen')
    })().catch(() => {})
    return () => { opruimen?.() }
  }, [])

  if (!melding) return null
  return (
    <div className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-mustard/90 p-3 text-ink sm:mx-5">
      <span className="text-xl" aria-hidden>🔔</span>
      <p className="min-w-[12rem] flex-1 text-sm font-medium">{melding === 'uit' ? 'Meldingen staan uit voor De Sneppe Kassa. Zet ze aan in de instellingen van de tablet om nieuwe bestellingen te horen.' : 'Zet meldingen aan om elke nieuwe bestelling meteen te horen, ook als de kassa-app op de achtergrond staat.'}</p>
      {melding === 'vragen' && <button className="btn-ink btn-sm" onClick={async () => {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        const p = await PushNotifications.requestPermissions()
        if (p.receive === 'granted') { await PushNotifications.register(); setMelding(null) } else setMelding('uit')
      }}>Meldingen aanzetten</button>}
    </div>
  )
}
