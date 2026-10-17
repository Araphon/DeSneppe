import Link from 'next/link'
import Image from 'next/image'
import type { Instellingen } from '@/lib/instellingen'
import { telE164 } from '@/lib/site'

export default function Footer({ inst, week }: { inst: Instellingen; week: { dag: string; tekst: string }[] }) {
  const b = inst.bedrijf
  return (
    <footer className="mt-20 bg-ink text-white/80">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image src="/logo-wit.png" alt="De Sneppe bij Luna" width={120} height={120} className="mb-4 h-24 w-auto" />
          <p className="text-sm">Broodjesbar in Meulebeke. Vers belegd, elke werkdag vanaf 6 uur.</p>
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg font-bold text-white">Adres</h2>
          <address className="not-italic text-sm leading-relaxed">
            {b.handelsnaam}<br />{b.adres}<br />{b.postcode} {b.gemeente}
          </address>
          <p className="mt-3 text-sm">
            <a href={`tel:${telE164(b.telefoon)}`} className="hover:text-white">{b.telefoon}</a><br />
            <a href={`mailto:${b.email}`} className="hover:text-white">{b.email}</a>
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg font-bold text-white">Openingsuren</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {week.map(w => (<div key={w.dag} className="contents"><dt className="capitalize">{w.dag}</dt><dd className={w.tekst === 'gesloten' ? 'text-white/50' : ''}>{w.tekst}</dd></div>))}
          </dl>
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg font-bold text-white">Volg ons</h2>
          <div className="flex gap-3">
            {b.facebook && <a href={b.facebook} target="_blank" rel="noopener" className="rounded-full bg-white/10 p-2.5 hover:bg-white/20" aria-label="Facebook"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.5V11H7v4h3v9h4v-9h3l1-4h-4V8.6c0-.4.3-.6.6-.6z"/></svg></a>}
            {b.instagram && <a href={b.instagram} target="_blank" rel="noopener" className="rounded-full bg-white/10 p-2.5 hover:bg-white/20" aria-label="Instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>}
          </div>
          <Link href="/bestellen" className="btn-brand mt-6">Bestel online</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-wrap justify-between gap-2 py-5 text-xs text-white/50">
          <span>© {new Date().getFullYear()} {b.handelsnaam} · BTW {b.btwNummer}</span>
          <span className="flex gap-4"><Link href="/algemene-voorwaarden" className="hover:text-white">Algemene voorwaarden</Link><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/menu" className="hover:text-white">Menu</Link></span>
        </div>
      </div>
    </footer>
  )
}
