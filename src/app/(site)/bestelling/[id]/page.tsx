import BestelStatus from '@/components/BestelStatus'
import MeldingenVraag from '@/components/app/MeldingenVraag'

export default function BestellingPagina({ params, searchParams }: { params: { id: string }; searchParams: { nieuw?: string } }) {
  return <div className="container-x py-10"><div className="mx-auto max-w-xl"><MeldingenVraag /></div><BestelStatus id={params.id} nieuw={searchParams.nieuw === '1'} /></div>
}
