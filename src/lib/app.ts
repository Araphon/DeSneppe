// Native app (Capacitor): herkenning en terugkeer vanuit de in-app browser (inloggen, betalen)

export const APP_SCHEME = 'be.desneppe.app'
export const APP_UA = 'DeSneppeApp'

export const isApp = (req: Request) => (req.headers.get('user-agent') || '').includes(APP_UA)

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Pagina in de in-app browser die meteen terugspringt naar de app (met knop als vangnet). */
export function terugNaarApp(pad: string, titel: string) {
  const url = `${APP_SCHEME}://${pad}`
  const html = `<!doctype html><html lang="nl-BE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titel)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FAF6EE;color:#141414;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px}a{display:inline-block;margin-top:16px;background:#F2B124;color:#141414;font-weight:700;padding:12px 22px;border-radius:8px;text-decoration:none}</style>
</head><body><div><p style="font-size:22px;font-weight:700;margin:0">${esc(titel)}</p><p style="opacity:.6;margin:6px 0 0">Je wordt teruggebracht naar de app…</p><a href="${esc(url)}">Terug naar De Sneppe</a></div>
<script>location.replace(${JSON.stringify(url)})</script></body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
