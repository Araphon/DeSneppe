import { draaiPlanner } from '@/lib/marketing'

export const dynamic = 'force-dynamic'

// Wordt elke 5 minuten aangeroepen door server.js (met geheime sleutel)
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) return new Response('nee', { status: 403 })
  try {
    const log = await draaiPlanner()
    return Response.json({ ok: true, log })
  } catch (e) {
    console.error('[cron marketing]', e)
    return Response.json({ ok: false }, { status: 500 })
  }
}
