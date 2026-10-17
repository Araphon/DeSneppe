import { api, ok } from '@/lib/api'
import { getBestelDagen } from '@/lib/tijdslots'

export const dynamic = 'force-dynamic'
export const GET = api(async () => ok(await getBestelDagen(), { headers: { 'Cache-Control': 'no-store' } }))
