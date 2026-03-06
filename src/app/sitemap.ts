import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://thindtransport.com'
  const pages = [
    { path: "", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/apply", changeFrequency: "weekly" as const, priority: 0.95 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/fleet", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/routes", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/pay-rates", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/benefits", changeFrequency: "monthly" as const, priority: 0.75 },
    { path: "/resources", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/testimonials", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/veterans", changeFrequency: "monthly" as const, priority: 0.65 },
    { path: "/pre-qualify", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/schedule-meeting", changeFrequency: "monthly" as const, priority: 0.5 },
  ]
  
  return pages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
