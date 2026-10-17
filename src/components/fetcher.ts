'use client'
// Kleine fetch-helper. POST/PUT/DELETE sturen altijd een body mee (nginx weigert POST zonder body).
export async function vraag<T = unknown>(url: string, methode: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: methode,
    headers: methode === 'GET' ? undefined : { 'Content-Type': 'application/json' },
    body: methode === 'GET' ? undefined : JSON.stringify(data ?? {}),
    cache: 'no-store',
  })
  let json: unknown = null
  try { json = await r.json() } catch {}
  if (!r.ok) throw new Error((json as { fout?: string })?.fout || `Fout ${r.status}`)
  return json as T
}
