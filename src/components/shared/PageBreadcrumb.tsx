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

export function PageBreadcrumb({ pageName, category, parentPage, className = "" }: PageBreadcrumbProps) {
  return (
    <nav className={`bg-[rgba(11,20,34,0.95)] backdrop-blur-xl pt-20 pb-3 border-b border-white/5 ${className}`} aria-label="Breadcrumb">
      <div className="container">
        <ol className="flex items-center justify-center gap-2 text-xs">
          {/* Category */}
          <li className="text-orange font-display font-semibold uppercase tracking-[0.18em]">
            {category}
          </li>
          
          <li className="text-white/40">
            <ChevronRight className="h-3 w-3" />
          </li>
          
          {/* Optional Parent Page */}
          {parentPage && (
            <>
              <li>
                <Link 
                  href={parentPage.href}
                  className="text-white/70 hover:text-white font-medium transition-colors"
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

