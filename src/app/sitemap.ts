import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

export const revalidate = 3600
export default function sitemap(): MetadataRoute.Sitemap {
  const nu = new Date()
  return [
    { url: `${SITE}/`, lastModified: nu, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/menu`, lastModified: nu, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/bestellen`, lastModified: nu, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/over-ons`, lastModified: nu, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/contact`, lastModified: nu, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/algemene-voorwaarden`, lastModified: nu, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE}/privacy`, lastModified: nu, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
