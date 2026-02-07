import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/auth/', '/settings/', '/projects/', '/notifications/'],
    },
    sitemap: 'https://www.envault.tech/sitemap.xml',
  }
}
