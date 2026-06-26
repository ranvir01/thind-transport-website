"use client"

/**
 * Driver app chrome: slim top bar + four thumb-size bottom tabs.
 * Everything a driver needs is at most one tab + one tap away.
 */
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageSquare, Wallet, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { PRODUCT } from "@/lib/hub/product"
import { NotificationsBell } from "@/components/hub/NotificationsBell"

const TABS = [
  { href: "/hub/driver", label: "Home", icon: Home },
  { href: "/hub/driver/messages", label: "Messages", icon: MessageSquare },
  { href: "/hub/driver/pay", label: "Pay", icon: Wallet },
  { href: "/hub/driver/more", label: "More", icon: Menu },
]

function isActive(pathname: string, href: string): boolean {
  return href === "/hub/driver" ? pathname === "/hub/driver" : pathname.startsWith(href)
}

export function DriverNav({ firstName }: { firstName: string }) {
  const pathname = usePathname()

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur-sm">
        <Link href="/hub/driver" className="leading-none">
          <span className="brand-wordmark text-base font-semibold text-fg tracking-[0.14em]">
            {PRODUCT.wordmark}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-body-sm text-fg-2">Hey, {firstName}</span>
          <NotificationsBell />
        </div>
      </header>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/98 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-h-[60px] flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide",
                isActive(pathname, tab.href) ? "text-gold" : "text-fg-3 hover:text-fg"
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
