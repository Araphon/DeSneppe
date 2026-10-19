import { redirect } from 'next/navigation'
import { doorstuurUrl } from '@/lib/doorsturen'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Afrekenen', robots: { index: false } }
export default async function L({ children }: { children: React.ReactNode }) {
  const naar = await doorstuurUrl()
  if (naar) redirect(naar)
  return children
}
