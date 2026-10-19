import type { Metadata } from 'next'
import Shop from '@/components/Shop'
import { getMenu } from '@/lib/catalogus'
import { getInstellingen } from '@/lib/instellingen'
import { redirect } from 'next/navigation'
import { doorstuurUrl } from '@/lib/doorsturen'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Online bestellen – broodjes afhalen in Meulebeke',
  description: 'Bestel je broodje, panini, pasta of soep online bij De Sneppe in Meulebeke. Kies je afhaalmoment en betaal bij het afhalen.',
  alternates: { canonical: '/bestellen' },
}

export default async function Bestellen() {
  const naar = await doorstuurUrl()
  if (naar) redirect(naar)
  const [menu, inst] = await Promise.all([getMenu(), getInstellingen()])
  return <Shop menu={menu} banner={inst.bestellen.bannerTekst} bestellenActief={inst.bestellen.actief} />
}
