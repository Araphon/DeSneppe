import { redirect } from 'next/navigation'
import Zijbalk from '@/components/admin/Zijbalk'
import { huidigeAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await huidigeAdmin()
  if (!admin) redirect('/admin/login')
  return (
    <>
      <Zijbalk naam={admin.naam} />
      <div className="lg:pl-64"><div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div></div>
    </>
  )
}
