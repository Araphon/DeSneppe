import { z } from 'zod'
import { datumNaarDb } from './tijd'

export const regelSchema = z.object({
  type: z.enum(['OPEN', 'GESLOTEN']),
  titel: z.string().trim().max(80).nullable().optional(),
  startDatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eindDatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  startTijd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  eindTijd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  herhaling: z.enum(['GEEN', 'DAGELIJKS', 'WEKELIJKS', 'MAANDELIJKS', 'JAARLIJKS']),
  interval: z.coerce.number().int().min(1).max(52).default(1),
  weekdagen: z.array(z.number().int().min(1).max(7)).default([]),
  herhalingTot: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export function naarData(d: z.infer<typeof regelSchema>) {
  if (d.type === 'OPEN' && (!d.startTijd || !d.eindTijd)) throw new Error('Vul de openingsuren in.')
  if (d.startTijd && d.eindTijd && d.startTijd >= d.eindTijd) throw new Error('Het einduur moet na het beginuur liggen.')
  if (d.eindDatum && d.eindDatum < d.startDatum) throw new Error('De einddatum ligt voor de begindatum.')
  return {
    type: d.type, titel: d.titel || null,
    startDatum: datumNaarDb(d.startDatum), eindDatum: d.eindDatum ? datumNaarDb(d.eindDatum) : null,
    startTijd: d.startTijd || null, eindTijd: d.eindTijd || null,
    herhaling: d.herhaling, interval: d.interval, weekdagen: d.herhaling === 'WEKELIJKS' ? d.weekdagen : [],
    herhalingTot: d.herhalingTot ? datumNaarDb(d.herhalingTot) : null,
  }
}
