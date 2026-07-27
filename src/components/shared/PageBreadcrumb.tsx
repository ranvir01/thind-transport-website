import Link from "next/link"
import { ChevronRight } from "lucide-react"

export type PageCategory = "Drivers" | "Company" | "Portal"

interface PageBreadcrumbProps {
  pageName: string
  category: PageCategory
  parentPage?: {
    name: string
    href: string
  }
  className?: string
}

/**
 * BreadcrumbList structured data for the trail this component already renders.
 *
 * The visual breadcrumb has been on every page for a while and emitted nothing
 * machine-readable, so Google has been guessing the site's hierarchy from URLs
 * alone. Emitting it here rather than per-page means every page that already
 * uses this component gets it, with no call-site changes.
 *
 * Two deliberate choices:
 *  - `category` ("Drivers", "Company") is a visual grouping label, not a
 *    navigable page. It is omitted rather than given an invented URL — a
 *    breadcrumb item pointing at a route that doesn't exist is worse than a
 *    shorter trail.
 *  - The final item carries no `item` URL. Schema.org allows this for the
 *    current page, and it keeps the component from needing to know its own
 *    path (it renders in server components with no access to usePathname).
 */
function breadcrumbJsonLd(pageName: string, parentPage?: { name: string; href: string }) {
  const site = "https://thindtransport.com"
  const items: Record<string, unknown>[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: site },
  ]
  if (parentPage) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: parentPage.name,
      item: `${site}${parentPage.href}`,
    })
  }
  items.push({ "@type": "ListItem", position: items.length + 1, name: pageName })

  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items }
}

export function PageBreadcrumb({ pageName, category, parentPage, className = "" }: PageBreadcrumbProps) {
  return (
    <nav className={`bg-[rgba(19,20,24,0.95)] backdrop-blur-xl pt-20 pb-3 border-b border-white/5 ${className}`} aria-label="Breadcrumb">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(pageName, parentPage)) }}
      />
      <div className="container">
        <ol className="flex items-center justify-center gap-2 text-xs">
          {/* Category */}
          <li className="text-orange-400 font-display font-semibold uppercase tracking-[0.18em]">
            {category}
          </li>
          
          <li className="text-white/40">
            <ChevronRight className="h-3 w-3" />
          </li>
          
          {/* Optional Parent Page */}
          {parentPage && (
            <>
              <li>
                {/* min-h-6 = 24px, WCAG 2.2 AA's Target Size (Minimum, 2.5.8).
                    Not 44px: that is 2.5.5 at AAA, and it would triple the
                    height of a 12px breadcrumb bar that appears on every page. */}
                <Link
                  href={parentPage.href}
                  className="inline-flex items-center min-h-6 text-white/70 hover:text-white font-medium transition-colors"
                >
                  {parentPage.name}
                </Link>
              </li>
              <li className="text-white/40">
                <ChevronRight className="h-3 w-3" />
              </li>
            </>
          )}
          
          {/* Current Page */}
          <li 
            className="font-display font-bold truncate max-w-[200px] sm:max-w-none text-white tracking-[0.1em]"
            aria-current="page"
          >
            {pageName}
          </li>
        </ol>
      </div>
    </nav>
  )
}

