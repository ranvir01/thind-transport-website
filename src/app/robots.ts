import { MetadataRoute } from 'next'

const PRIVATE_PATHS = ['/api/', '/driver/', '/business-card']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Search engines + AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.)
      // are all welcome on public marketing pages.
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: 'https://thindtransport.com/sitemap.xml',
    host: 'https://thindtransport.com',
  }
}
