import BestelBord from '@/components/admin/BestelBord'
import { PaginaKop } from '@/components/admin/ui'
import PauzeKnop from '@/components/admin/PauzeKnop'

export const metadata = { title: 'Bestellingen' }

export default function AdminHome() {
  return (
    <>
      <PaginaKop titel="Bestellingen" sub="Live overzicht — ververst automatisch. Klik op een tegel om de status te wijzigen."><PauzeKnop /></PaginaKop>
      <BestelBord />
    </>
  )
}
