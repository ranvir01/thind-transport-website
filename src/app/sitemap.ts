import { MetadataRoute } from 'next'
import { STATES } from '@/lib/state-data'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://thindtransport.com'
  // Build-time snapshot — regenerated on every deploy.
  const lastModified = new Date()

  const pages = [
    { path: "", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/apply", changeFrequency: "weekly" as const, priority: 0.95 },
    { path: "/drivers", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/pay-rates", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/routes", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/app", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/brokers", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/shippers", changeFrequency: "monthly" as const, priority: 0.85 },
    { path: "/owner-operators", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/trust", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/quote", changeFrequency: "monthly" as const, priority: 0.85 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/cdl-jobs", changeFrequency: "weekly" as const, priority: 0.85 },
    ...STATES.map((state) => ({
      path: `/cdl-jobs/${state.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/fleet", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/benefits", changeFrequency: "monthly" as const, priority: 0.75 },
    { path: "/pay-breakdown", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/resources", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/tools/freight-class-calculator", changeFrequency: "monthly" as const, priority: 0.75 },
    { path: "/loadoff", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/fuel-program", changeFrequency: "monthly" as const, priority: 0.65 },
    { path: "/veterans", changeFrequency: "monthly" as const, priority: 0.65 },
    { path: "/pre-qualify", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/schedule-meeting", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  ]

  return pages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
