import { api, fout, ok, vereisAdmin } from '@/lib/api'
import { csvExport, rapport } from '@/lib/rapportage'
import { dagenTussen } from '@/lib/tijd'

export const dynamic = 'force-dynamic'

// GET ?van=YYYY-MM-DD&tot=YYYY-MM-DD&vergelijk=vorige|vorigjaar|geen[&formaat=csv]
export const GET = api(async req => {
  await vereisAdmin()
  const u = new URL(req.url)
  const van = u.searchParams.get('van') || '', tot = u.searchParams.get('tot') || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(van) || !/^\d{4}-\d{2}-\d{2}$/.test(tot) || tot < van) return fout('Ongeldige periode')
  if (dagenTussen(van, tot) > 800) return fout('Kies een periode van maximaal 2 jaar.')
  if (u.searchParams.get('formaat') === 'csv') {
    return new Response(await csvExport(van, tot), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="de-sneppe-bestellingen-${van}-tot-${tot}.csv"` } })
  }
  const v = u.searchParams.get('vergelijk')
  return ok(await rapport(van, tot, v === 'vorigjaar' ? 'vorigjaar' : v === 'geen' ? 'geen' : 'vorige'))
})
