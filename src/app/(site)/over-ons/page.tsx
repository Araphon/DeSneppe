import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import Tekst from '@/components/Tekst'
import { fotoLijst, getInhoud } from '@/lib/inhoud'
import { getMenu } from '@/lib/catalogus'
import { breadcrumbJsonLd } from '@/lib/site'

export const revalidate = 60
export const metadata: Metadata = {
  title: 'Over ons – De Sneppe bij Luna',
  description: 'Maak kennis met De Sneppe, de broodjesbar van Luna aan de Bruggesteenweg in Meulebeke. Vers belegde broodjes, soep en dagschotels, elke werkdag vanaf 6 uur.',
  alternates: { canonical: '/over-ons' },
}

export default async function OverOns() {
  const [t, menu] = await Promise.all([getInhoud(), getMenu()])
  const gekozen = fotoLijst(t['over.fotos'])
  const fotos = gekozen.length
    ? gekozen.map((src, i) => ({ id: `f${i}`, afbeelding: src, naam: 'De Sneppe' }))
    : menu.filter(c => !/drank|mee te nemen/i.test(c.naam)).map(c => c.producten.find(p => p.afbeelding)).filter((p): p is NonNullable<typeof p> => Boolean(p)).slice(1, 4)
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ naam: 'Over ons', pad: '/over-ons' }])} />
      <section className="container-x grid gap-12 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
        <div>
          <p className="mb-2 font-semibold uppercase tracking-wider text-brand-dark">Over ons</p>
          <h1 className="h-display text-4xl sm:text-5xl">{t['over.titel']}</h1>
          <Tekst tekst={t['over.tekst']} className="mt-6 text-lg text-ink/80" />
          <Link href="/bestellen" className="btn-brand mt-6 px-7 py-3">Bestel online</Link>
        </div>
        <div className="flex flex-col gap-4">
          <div className="grid place-items-center rounded-lg bg-ink p-10">
            <Image src="/logo-wit.png" alt="Logo De Sneppe bij Luna" width={260} height={260} className="h-56 w-auto" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {fotos.map(p => <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg"><Image src={p.afbeelding!} alt={p.naam} fill sizes="150px" className="object-cover" /></div>)}
          </div>
        </div>
      </section>
    </>
  )
}
