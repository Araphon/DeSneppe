import Header from '@/components/Header'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import AppBrug from '@/components/app/AppBrug'
import AppNav from '@/components/app/AppNav'
import { businessJsonLd, getSiteData, statusTekst, weekTekst } from '@/lib/site'

export const revalidate = 60

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSiteData()
  return (
    <>
      <JsonLd data={businessJsonLd(s.inst, s.week)} />
      <Header status={statusTekst(s)} open={s.nuOpen} />
      <main>{children}</main>
      <div className="niet-app"><Footer inst={s.inst} week={weekTekst(s.week)} /></div>
      <AppNav />
      <AppBrug />
    </>
  )
}
