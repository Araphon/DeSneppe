import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  if (process.env.NOINDEX === '1') return { rules: [{ userAgent: '*', disallow: '/' }] }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/kassa', '/api/', '/account', '/afrekenen', '/bestelling/'] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
