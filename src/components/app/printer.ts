'use client'
// Brug naar de eigen native plugin "SneppePrinter" in de kassa-app (iOS + Android):
// stuurt ruwe printerdata (ESC/POS of ZPL) via TCP naar een printer in het winkelnetwerk (poort 9100).
// Een webpagina kan dat niet; daarom werkt dit enkel in de De Sneppe Kassa-app.
import { Capacitor, registerPlugin } from '@capacitor/core'

type SneppePrinterPlugin = {
  send(o: { host: string; port: number; data: string; timeoutMs?: number }): Promise<void>
  keepAwake(o: { aan: boolean }): Promise<void>
}
export const SneppePrinter = registerPlugin<SneppePrinterPlugin>('SneppePrinter')

export const kanRuwPrinten = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SneppePrinter')

function naarBase64(data: Uint8Array | string) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** "192.168.68.139" of "192.168.68.139:9100" → host + poort */
export function adres(ip: string) {
  const [host, poort] = ip.trim().split(':')
  return { host, port: Number(poort) || 9100 }
}

export async function stuurRuw(ip: string, data: Uint8Array | string) {
  if (!kanRuwPrinten()) throw new Error('Rechtstreeks printen kan enkel in de De Sneppe Kassa-app')
  const { host, port } = adres(ip)
  await SneppePrinter.send({ host, port, data: naarBase64(data), timeoutMs: 8000 })
}
