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

export function DriverNav({
  firstName,
  badges,
}: {
  firstName: string
  /** Unread counts keyed by tab href; a missing or zero entry renders no badge. */
  badges?: Partial<Record<string, number>>
}) {
  const pathname = usePathname()

  return (
    <>
      {/* The driver app is deliberately dark (cab use at night), so its chrome
          uses the forced-dark --driver-* ladder — the mode-dependent surface/fg
          tokens resolve to light values here and made the wordmark invisible.
          Height = 56px of content + the notch/Dynamic Island inset, padded on
          top so the wordmark row sits below the status bar. No blur here: one
          frosted surface per scroller, and the tab bar has it. */}
      <header className="fixed top-0 inset-x-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center justify-between border-b border-driver-border bg-driver-surface px-4 pt-[env(safe-area-inset-top,0px)]">
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

      {/* M3/HIG tab bar: 64px rows, home-indicator inset (never less than 8px)
          under them, side insets in landscape. Solid --driver-surface as the
          floor; where backdrop-filter exists the bar goes to 86% and blurs the
          content scrolling under it. Not .hub-tabbar — that class paints
          color-mix(var(--surface)), the OFFICE surface, white when the stored
          mode is light. */}
      <nav
        data-bottom-bar="driver"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-driver-border bg-driver-surface supports-[backdrop-filter]:bg-[rgba(28,30,35,0.86)] supports-[backdrop-filter]:backdrop-blur-[14px] pb-[max(env(safe-area-inset-bottom,0px),8px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] shadow-[0_-1px_0_rgba(255,255,255,0.05),0_-8px_24px_rgba(0,0,0,0.45)]"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href)
            const count = badges?.[tab.href] ?? 0
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-control pt-2 pb-1 text-[12px] font-semibold normal-case",
                  "",
                  active ? "font-bold text-[color:var(--driver-accent)]" : "text-steel-300"
                )}
              >
                <span className="relative flex h-8 w-16 items-center justify-center rounded-pill">
                  {active ? (
                    <span aria-hidden className="hub-pill-in absolute inset-0 rounded-pill bg-white/10" />
                  ) : null}
                  <span className="relative flex h-6 w-6 items-center justify-center">
                    <tab.icon
                      className={cn(
                        "h-6 w-6 transition-colors duration-fast",
                        active ? "hub-tab-pop text-[color:var(--driver-accent)]" : "text-steel-300"
                      )}
                      strokeWidth={active ? 2.4 : 2}
                    />
                    {count > 0 ? (
                      <span className="absolute -top-1 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-red-500 px-1 text-[11px] font-bold tabular-nums leading-none text-white ring-2 ring-driver-surface">
                        {count}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="transition-colors duration-fast">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
