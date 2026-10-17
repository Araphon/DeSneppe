import { syncBetaling } from '@/lib/bestelling'

// Mollie stuurt enkel het payment-id; de echte status halen we zelf op (niet te vervalsen)
export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null)
    const id = String(form?.get('id') || '')
    if (/^tr_[A-Za-z0-9]+$/.test(id)) await syncBetaling(id)
  } catch (e) {
    console.error('[mollie-webhook]', e)
    return new Response('fout', { status: 500 }) // Mollie probeert later opnieuw
  }
  return new Response('ok')
}
