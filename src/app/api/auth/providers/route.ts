import { actieveProviders } from '@/lib/sso'

export const dynamic = 'force-dynamic'
export async function GET() { return Response.json(actieveProviders()) }
