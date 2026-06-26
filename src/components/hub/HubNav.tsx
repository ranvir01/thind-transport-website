"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { PRODUCT } from "@/lib/hub/product"
import {
  HUB_PRIMARY_SECTIONS,
  HUB_UTILITY_LINKS,
  activePrimarySection,
  isNavActive,
} from "@/lib/hub/navigation"
import { NotificationsBell } from "@/components/hub/NotificationsBell"
import { HubAppearanceMenu } from "@/components/hub/HubAppearanceMenu"
import { CommandPalette } from "@/components/hub/CommandPalette"
import { HubTourHost } from "@/components/hub/HubTour"

export function HubShell({
  user,
  children,
}: {
  user: { name: string; role: string; carrierName?: string }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const section = activePrimarySection(pathname)
  const isOwner = user.role === "owner"
  const utility = HUB_UTILITY_LINKS.filter((l) => !l.ownerOnly || isOwner)
  const mobilePrimaries = HUB_PRIMARY_SECTIONS.slice(0, 5)

  return (
    <div className="hauldesk-shell min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-sm md:px-6">
        <Link href="/hub" className="shrink-0 min-w-0">
          <span className="block font-semibold text-fg tracking-tight truncate">{PRODUCT.name}</span>
          <span className="block text-[11px] text-fg-3 truncate max-w-[140px]">
            {user.carrierName || PRODUCT.tagline}
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5 ml-4 min-w-0 flex-1 overflow-x-auto" data-tour="hub-primary-nav">
          {HUB_PRIMARY_SECTIONS.map((primary) => {
            const active = primary.id === section.id
            const first = primary.sub[0]?.href ?? "/hub"
            return (
              <Link
                key={primary.id}
                href={first}
                className={cn(
                  "shrink-0 rounded-control px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-accent-soft text-accent-text" : "text-fg-2 hover:bg-hover hover:text-fg"
                )}
              >
                {primary.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0" data-tour="hub-command-palette">
          <CommandPalette isOwner={isOwner} />
          <HubAppearanceMenu />
          <NotificationsBell direction="down" />
          <div className="hidden sm:block text-right max-w-[120px]">
            <p className="text-sm font-medium text-fg truncate">{user.name.split(" ")[0]}</p>
            <p className="text-[10px] uppercase tracking-wide text-fg-3">{user.role}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/hub/login" })}
            className="flex h-9 w-9 items-center justify-center rounded-control border border-border-strong text-fg-2 hover:bg-hover"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile sub-nav */}
      <div className="md:hidden sticky top-14 z-30 border-b border-border bg-surface overflow-x-auto">
        <div className="flex gap-1 px-3 py-2 min-w-max">
          {section.sub.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 rounded-pill px-3 py-1.5 text-xs font-semibold",
                isNavActive(pathname, link.href) ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-fg-2"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex">
        <aside className="hidden md:flex w-[212px] shrink-0 flex-col border-r border-border bg-surface sticky top-14 self-start max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-3">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.sub.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "block rounded-control px-2.5 py-2 text-sm font-medium transition-colors",
                    isNavActive(pathname, link.href)
                      ? "bg-accent-soft text-accent-text"
                      : "text-fg-2 hover:bg-hover hover:text-fg"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <p className="px-2 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-3">More</p>
            <div className="space-y-0.5">
              {utility.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  data-tour={link.href === "/hub/guide" ? "hub-setup-guide" : undefined}
                  className={cn(
                    "block rounded-control px-2.5 py-2 text-sm transition-colors",
                    isNavActive(pathname, link.href)
                      ? "bg-accent-soft text-accent-text font-medium"
                      : "text-fg-3 hover:bg-hover hover:text-fg-2"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8 max-w-[1400px]">
          <HubTourHost />
          {children}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {mobilePrimaries.map((primary) => {
            const active = primary.id === section.id
            const href = primary.sub[0]?.href ?? "/hub"
            return (
              <Link
                key={primary.id}
                href={href}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center px-1 text-[10px] font-semibold",
                  active ? "text-accent-text" : "text-fg-3"
                )}
              >
                {primary.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

/** @deprecated use HubShell */
export const HubNav = HubShell
