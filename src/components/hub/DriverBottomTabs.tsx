"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/hub/driver", label: "Load" },
  { href: "/hub/driver/documents", label: "Docs" },
  { href: "/hub/driver/pay", label: "Pay" },
  { href: "/hub/driver/more", label: "More" },
]

export function DriverBottomTabs() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-navy-900/95 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-[430px] grid-cols-4 text-center text-[11px] font-black uppercase tracking-wide text-steel-200">
        {TABS.map((tab) => {
          const active = tab.href === "/hub/driver" ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn("flex min-h-[56px] items-center justify-center py-3", active ? "text-gold" : "text-steel-200")}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
