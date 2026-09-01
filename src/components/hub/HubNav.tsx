"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarClock, ChevronDown, CircleDollarSign, House, LayoutGrid, Package,
  PanelLeftClose, PanelLeftOpen, Truck, Users,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PRODUCT } from "@/lib/hub/product"
import { hubPrimarySections, hubUtilityGroups, isNavActive } from "@/lib/hub/navigation"
import { setSidebarCollapsedAction } from "@/app/hub/_actions/prefs"
import { NotificationsBell } from "@/components/hub/NotificationsBell"
import { OfficeOfflineBanner } from "@/components/hub/OfficeOfflineBanner"
import { CommandPalette } from "@/components/hub/CommandPalette"
import { HubTourHost } from "@/components/hub/HubTour"
import { LoadOffMark } from "@/components/hub/LoadOffMark"
import { WorkspaceChip } from "@/components/hub/WorkspaceChip"
import { UserMenu } from "@/components/hub/UserMenu"

/** Tab-bar icons by primary-section id; LayoutGrid is the safe fallback. */
const SECTION_ICONS: Record<string, LucideIcon> = {
  overview: House,
  dispatch: CalendarClock,
  loads: Package,
  money: CircleDollarSign,
  fleet: Truck,
  people: Users,
}

/**
 * Count badge for a nav item. Capped at 9+ so a neglected queue can never
 * stretch the sidebar row it sits in.
 */
function NavCount({ n }: { n: number }) {
  return (
    <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-pill bg-accent px-1.5 py-[1px] text-[10.5px] font-bold text-accent-fg align-middle">
      {n > 9 ? "9+" : n}
    </span>
  )
}

export function HubShell({
  user,
  smallCarrier,
  accent,
  inboxCount = 0,
  railCollapsed = false,
  setupComplete = false,
  children,
}: {
  user: { name: string; role: string; carrierName?: string }
  /** Resolved per tenant by the office layout (nav.small_carrier_mode flag). */
  smallCarrier: boolean
  /** Tenant branding accent (validated hex) — identity chip only, never controls. */
  accent?: string | null
  /** Emailed rate cons waiting for review — badged on Loads → Inbox. */
  inboxCount?: number
  /** Per-user preference (hub.user_preferences). The desktop sidebar starts as the 56px rail. */
  railCollapsed?: boolean
  /** Core setup checklist done — the Setup group folds up so it stops taking scan time. */
  setupComplete?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // Header casts a shadow only once content scrolls beneath it.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  const sections = hubPrimarySections(smallCarrier)
  const section = sections.find((s) => s.match(pathname)) ?? sections[0]!
  const isOwner = user.role === "owner"
  const groups = hubUtilityGroups(smallCarrier)
    .map((g) => ({ ...g, links: g.links.filter((l) => !l.ownerOnly || isOwner) }))
    .filter((g) => g.links.length > 0)
  const mobilePrimaries = sections.slice(0, 5)

  // Collapsed = the 56px icon rail. Local state flips instantly; the
  // preference write is fire-and-forget — a failed save costs one reload of
  // width, not a broken sidebar.
  const [collapsed, setCollapsed] = useState(railCollapsed)
  const toggleRail = () => {
    const next = !collapsed
    setCollapsed(next)
    void setSidebarCollapsedAction(next)
  }
  // Setup folds once the core checklist is done, but never hides the page you
  // are on: an active Setup link keeps its group open.
  const setupHasActive = groups.some(
    (g) => g.id === "setup" && g.links.some((l) => isNavActive(pathname, l.href))
  )
  const [setupOpen, setSetupOpen] = useState(!setupComplete)

  return (
    <div className="hauldesk-shell min-h-screen bg-bg text-fg">
      <header
        className={cn(
          "sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center gap-2 border-b border-border bg-surface px-3 pt-[env(safe-area-inset-top,0px)] transition-shadow duration-standard md:px-6",
          scrolled && "shadow-card"
        )}
      >
        <Link href="/hub" className="flex shrink-0 items-center gap-2" aria-label={PRODUCT.name}>
          <LoadOffMark size={28} />
          <span className="hidden font-semibold tracking-tight text-fg lg:block">{PRODUCT.name}</span>
        </Link>
        <span aria-hidden className="hidden h-5 w-px bg-border lg:block" />
        <WorkspaceChip name={user.carrierName || PRODUCT.name} accent={accent} isOwner={isOwner} />

        <nav
          className="hidden lg:flex items-center gap-0.5 ml-2 min-w-0 flex-1 overflow-x-auto"
          data-tour="hub-primary-nav"
        >
          {sections.map((primary) => {
            const active = primary.id === section.id
            const first = primary.sub[0]?.href ?? "/hub"
            return (
              <Link
                key={primary.id}
                href={first}
                className={cn(
                  "shrink-0 rounded-control px-3 py-2 text-sm font-medium",
                  active ? "bg-accent-soft text-accent-text" : "text-fg-2 hover:bg-hover hover:text-fg"
                )}
              >
                {primary.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 shrink-0" data-tour="hub-command-palette">
          <CommandPalette isOwner={isOwner} smallCarrier={smallCarrier} />
          <NotificationsBell direction="down" />
          <UserMenu name={user.name} role={user.role} />
        </div>
      </header>

      <OfficeOfflineBanner />

      {/* Mobile sub-nav: the active section's pages. Active gets the one soft
          chip; the rest are quiet text — no gray blob row. */}
      <div className="md:hidden sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-30 border-b border-border bg-surface overflow-x-auto snap-row">
        <div className="flex gap-1 px-2 min-w-max">
          {section.sub.map((link) => {
            const active = isNavActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative shrink-0 px-3 py-2.5 text-[13.5px] transition-colors duration-fast",
                  active ? "font-semibold text-fg" : "font-medium text-fg-3 active:text-fg-2"
                )}
              >
                {link.label}
                {link.href === "/hub/inbox" && inboxCount > 0 ? <NavCount n={inboxCount} /> : null}
                {active ? (
                  <span
                    aria-hidden
                    className="hub-underline-in absolute inset-x-3 bottom-0 h-[2.5px] rounded-pill bg-accent"
                  />
                ) : null}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex">
        <aside
          data-rail={collapsed ? "collapsed" : "expanded"}
          className={cn(
            "hidden md:flex shrink-0 flex-col border-r border-border bg-surface sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] self-start max-h-[calc(100vh-3.5rem-env(safe-area-inset-top,0px))] overflow-y-auto transition-[width] duration-standard",
            collapsed ? "w-14" : "w-[212px]"
          )}
        >
          {collapsed ? (
            /* The rail: six primary sections as icons. Sub-links have no icons
               of their own, so the rail shows sections, not the active
               section's pages — one click on a section lands on its first page,
               a second click on the toggle brings the pages back. */
            <nav className="flex flex-1 flex-col items-center gap-1 p-2" aria-label="Sections">
              {sections.map((primary) => {
                const active = primary.id === section.id
                const Icon = SECTION_ICONS[primary.id] ?? LayoutGrid
                const badge = primary.id === "loads" && inboxCount > 0
                return (
                  <Link
                    key={primary.id}
                    href={primary.sub[0]?.href ?? "/hub"}
                    title={primary.label}
                    aria-label={primary.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-control",
                      active ? "bg-accent-soft text-accent-text" : "text-fg-3 hover:bg-hover hover:text-fg"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.9} />
                    {badge ? (
                      <span
                        aria-hidden
                        className="absolute right-1 top-1 h-2 w-2 rounded-pill bg-accent ring-2 ring-surface"
                      />
                    ) : null}
                  </Link>
                )
              })}
              <span aria-hidden className="my-1 h-px w-6 bg-border" />
              <button
                type="button"
                onClick={toggleRail}
                title="More"
                aria-label="Show more links"
                className="flex h-10 w-10 items-center justify-center rounded-control text-fg-3 hover:bg-hover hover:text-fg"
              >
                <LayoutGrid className="h-5 w-5" strokeWidth={1.9} />
              </button>
            </nav>
          ) : (
            <div className="p-3">
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-3">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.sub.map((link) => {
                  const active = isNavActive(pathname, link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "relative block rounded-control px-2.5 py-2 text-sm font-medium",
                        active ? "bg-accent-soft text-accent-text" : "text-fg-2 hover:bg-hover hover:text-fg"
                      )}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="hub-pop-enter absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-pill bg-accent"
                        />
                      ) : null}
                      {link.label}
                      {link.href === "/hub/inbox" && inboxCount > 0 ? <NavCount n={inboxCount} /> : null}
                    </Link>
                  )
                })}
              </div>

              {groups.map((group) => {
                const foldable = group.id === "setup"
                const open = !foldable || setupOpen || setupHasActive
                return (
                  <div key={group.id} data-nav-group={group.id}>
                    {foldable ? (
                      <button
                        type="button"
                        onClick={() => setSetupOpen((v) => !v)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between px-2 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-3 hover:text-fg-2"
                      >
                        {group.label}
                        <ChevronDown
                          className={cn("h-3.5 w-3.5 transition-transform duration-fast", open ? "" : "-rotate-90")}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <p className="px-2 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-3">
                        {group.label}
                      </p>
                    )}
                    {open ? (
                      <div className="space-y-0.5">
                        {group.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            data-tour={link.href === "/hub/guide" ? "hub-setup-guide" : undefined}
                            className={cn(
                              "block rounded-control px-2.5 py-2 text-sm",
                              isNavActive(pathname, link.href)
                                ? "bg-accent-soft text-accent-text font-medium"
                                : "text-fg-3 hover:bg-hover hover:text-fg-2"
                            )}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}

          {/* The toggle sits at the foot of the sidebar in both states, so the
              control that changes the width is in the same place either way. */}
          <div className={cn("mt-auto border-t border-border p-2", collapsed ? "flex justify-center" : "")}>
            <button
              type="button"
              onClick={toggleRail}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              data-testid="sidebar-toggle"
              className={cn(
                "flex items-center gap-2 rounded-control text-[12.5px] font-medium text-fg-3 hover:bg-hover hover:text-fg",
                collapsed ? "h-10 w-10 justify-center" : "h-9 w-full px-2.5"
              )}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              {collapsed ? null : "Collapse"}
            </button>
          </div>
        </aside>

        {/* Clear the fixed tab bar AND the home-indicator inset it grows by:
            the bar is ~67px, plus env(safe-area-inset-bottom) (~34px on an
            installed iPhone PWA). A flat pb-28 left only ~11px of margin
            there — enough today, but not a property anyone could rely on. */}
        <main className="flex-1 min-w-0 px-4 py-5 md:px-8 md:py-8 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8 max-w-[1400px]">
          <HubTourHost />
          {children}
        </main>
      </div>

      {/* Mobile tab bar: icons above 10px labels, active = accent + heavier stroke */}
      <nav
        data-bottom-bar="office"
        className="hub-tabbar md:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      >
        <div className="grid grid-cols-5">
          {mobilePrimaries.map((primary) => {
            const active = primary.id === section.id
            const href = primary.sub[0]?.href ?? "/hub"
            const Icon = SECTION_ICONS[primary.id] ?? LayoutGrid
            return (
              <Link
                key={primary.id}
                href={href}
                aria-current={active ? "page" : undefined}
                className="group flex min-h-[58px] flex-col items-center justify-center gap-[3px] px-1 pt-2 pb-1.5"
              >
                {/* The pill is the active indicator — it springs in behind the
                    icon on tab change; inactive tabs tint it on press so touch
                    always answers back. */}
                <span
                  className={cn(
                    "relative flex h-8 w-14 items-center justify-center rounded-pill transition-colors duration-fast",
                    !active && "group-active:bg-hover"
                  )}
                >
                  {active ? (
                    <span aria-hidden className="hub-pill-in absolute inset-0 rounded-pill bg-accent-soft" />
                  ) : null}
                  <Icon
                    className={cn(
                      "relative h-[22px] w-[22px] transition-colors duration-fast",
                      active ? "hub-tab-pop text-accent-text" : "text-fg-3"
                    )}
                    strokeWidth={active ? 2.3 : 1.9}
                    fill={active ? "currentColor" : "none"}
                    fillOpacity={active ? 0.16 : 0}
                  />
                </span>
                <span
                  className={cn(
                    "text-[10.5px] transition-colors duration-fast",
                    active ? "font-bold text-accent-text" : "font-semibold text-fg-3"
                  )}
                >
                  {primary.label}
                </span>
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
