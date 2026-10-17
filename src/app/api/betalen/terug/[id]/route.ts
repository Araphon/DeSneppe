import { terugNaarApp } from '@/lib/app'

export const dynamic = 'force-dynamic'

// Mollie stuurt de klant hierheen na betalen in de app (in-app browser) → terug naar de app
export function GET(_req: Request, { params }: { params: { id: string } }) {
  return terugNaarApp(`bestelling/${encodeURIComponent(params.id)}`, 'Betaling afgerond')
}
