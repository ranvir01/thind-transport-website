import Link from "next/link"
import { ChevronRight } from "lucide-react"

// Brand Colors from Master Spec
const BRAND = {
  navy: "#001F3F",
  orange: "#FF9500",
}

export type PageCategory = "Drivers" | "Company" | "Portal"

interface PageBreadcrumbProps {
  pageName: string
  category: PageCategory
  parentPage?: {
    name: string
    href: string
  }
}

export function PageBreadcrumb({ pageName, category, parentPage }: PageBreadcrumbProps) {
  return (
    <nav className="bg-[#001F3F]/95 backdrop-blur-xl pt-20 pb-2" aria-label="Breadcrumb">
      <div className="container">
        <ol className="flex items-center justify-center gap-2 text-xs">
          {/* Category */}
          <li className="text-white/60 font-medium uppercase tracking-wider">
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
            className="font-bold truncate max-w-[200px] sm:max-w-none text-white"
            aria-current="page"
          >
            {pageName}
          </li>
        </ol>
      </div>
    </nav>
  )
}

