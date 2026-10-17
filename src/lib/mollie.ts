import createMollieClient, { type MollieClient } from '@mollie/api-client'
import { getInstellingen } from './instellingen'

export async function mollie(): Promise<MollieClient | null> {
  const { betalen } = await getInstellingen()
  return betalen.mollieApiKey ? createMollieClient({ apiKey: betalen.mollieApiKey }) : null
}

export function isGeldigeSleutel(k: string) {
  return /^(test|live)_[A-Za-z0-9]{20,}$/.test(k)
}
