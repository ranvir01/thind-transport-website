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
import { LoadOffMark } from "@/components/hub/LoadOffMark"

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
      {/* The driver app is deliberately dark (cab use at night), so its chrome
          uses fixed dark colors — the mode-dependent surface/fg tokens resolve
          to light values here and made the wordmark invisible. */}
      <header className="fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-navy-600/95 px-4 backdrop-blur-sm">
        {/* The mark carries its own background, so it reads the same on this
            dark chrome as it does on the office's light shell and on the home
            screen the driver launched from. */}
        <Link href="/hub/driver" className="flex items-center gap-2 leading-none">
          <LoadOffMark size={24} />
          <span className="brand-wordmark text-base font-semibold text-white tracking-[0.14em]">
            {PRODUCT.wordmark}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-body-sm text-steel-100">Hey, {firstName}</span>
          <NotificationsBell variant="dark" />
        </div>
      </header>

      <nav
        data-bottom-bar="driver"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-navy-600/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.35),0_-16px_40px_rgba(0,0,0,0.45)]"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="group flex min-h-[60px] flex-col items-center justify-center gap-[3px] pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wide"
              >
                <span
                  className={cn(
                    "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-fast",
                    !active && "group-active:bg-white/5"
                  )}
                >
                  {active ? (
                    <span aria-hidden className="hub-pill-in absolute inset-0 rounded-full bg-white/10" />
                  ) : null}
                  <tab.icon
                    className={cn(
                      "relative h-[21px] w-[21px] transition-colors duration-fast",
                      active ? "hub-tab-pop text-[color:var(--driver-accent)]" : "text-steel-400 group-hover:text-white"
                    )}
                    strokeWidth={active ? 2.3 : 1.9}
                    fill={active ? "currentColor" : "none"}
                    fillOpacity={active ? 0.15 : 0}
                  />
                </span>
                <span className={active ? "text-[color:var(--driver-accent)]" : "text-steel-400 group-hover:text-white"}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
