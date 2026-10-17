import { getMenu } from '@/lib/catalogus'
import { api, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'
export const GET = api(async () => ok(await getMenu(), { headers: { 'Cache-Control': 'no-store' } }))
