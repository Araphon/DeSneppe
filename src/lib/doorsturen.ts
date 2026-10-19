import { headers } from 'next/headers'
import { APP_UA } from './app'
import { getInstellingen } from './instellingen'

/** URL waarnaar online bestellen tijdelijk doorverwezen wordt, of null. In de De Sneppe-app wordt nooit doorverwezen. */
export async function doorstuurUrl(ua?: string | null): Promise<string | null> {
  const { doorsturen } = await getInstellingen()
  if (!doorsturen.actief || !/^https?:\/\/\S+$/.test(doorsturen.url)) return null
  const agent = ua ?? headers().get('user-agent') ?? ''
  return agent.includes(APP_UA) ? null : doorsturen.url
}
