import type { Metadata, Viewport } from 'next'
import { redirect } from 'next/navigation'
import KassaApp from '@/components/admin/KassaApp'
import { huidigeAdmin } from '@/lib/auth'
import { getInstellingen } from '@/lib/instellingen'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Kassa · De Sneppe',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Sneppe Kassa', statusBarStyle: 'black-translucent' },
}
export const viewport: Viewport = { themeColor: '#141414', width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false }

export default async function Kassa() {
  if (!(await huidigeAdmin())) redirect('/admin/login?terug=/kassa')
  const inst = await getInstellingen()
  return <KassaApp printers={inst.printers} ontwerp={{ ticket: inst.ticketOntwerp, sticker: inst.stickerOntwerp }} />
}
