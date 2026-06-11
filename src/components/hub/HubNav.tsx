"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, ClipboardList, Package, Truck, Users, Building2, Map as MapIcon,
  Upload, Settings, LogOut, Menu, X, DollarSign, Fuel, ShieldCheck, BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PRODUCT } from "@/lib/hub/product"
import { NotificationsBell } from "@/components/hub/NotificationsBell"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  ownerOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/hub", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hub/dispatch", label: "Dispatch", icon: ClipboardList },
  { href: "/hub/loads", label: "Loads", icon: Package },
  { href: "/hub/money", label: "Money", icon: DollarSign },
  { href: "/hub/fuel", label: "Fuel", icon: Fuel },
  { href: "/hub/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/hub/customers", label: "Customers", icon: Building2 },
  { href: "/hub/drivers", label: "Drivers", icon: Users },
  { href: "/hub/fleet", label: "Fleet", icon: Truck },
  { href: "/hub/map", label: "Map", icon: MapIcon },
  { href: "/hub/reports", label: "Reports", icon: BarChart3 },
  { href: "/hub/import", label: "Import", icon: Upload },
  { href: "/hub/settings/users", label: "Users", icon: Settings, ownerOnly: true },
]

const MOBILE_TABS = ["/hub", "/hub/dispatch", "/hub/loads", "/hub/fleet"]

function isActive(pathname: string, href: string): boolean {
  return href === "/hub" ? pathname === "/hub" : pathname.startsWith(href)
}

export function HubNav({ user }: { user: { name: string; role: string; carrierName?: string } }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const items = NAV_ITEMS.filter((i) => !i.ownerOnly || user.role === "owner")
  const mobileTabs = items.filter((i) => MOBILE_TABS.includes(i.href))
  const moreItems = items.filter((i) => !MOBILE_TABS.includes(i.href))

  const closeAnd = () => setMenuOpen(false)

  return (
    <>
      {/* ---- Desktop sidebar ---- */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-white/10 bg-navy-900/95 backdrop-blur-sm">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/hub" className="block">
            <span className="brand-wordmark text-lg font-semibold text-white tracking-[0.14em]">{PRODUCT.wordmark}</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.3em] text-gold mt-0.5 truncate">
              {user.carrierName || PRODUCT.tagline}
            </span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive(pathname, item.href)
                  ? "bg-orange/15 text-white border border-orange/30"
                  : "text-steel-200 hover:bg-white/5 hover:text-white border border-transparent"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-[11px] uppercase tracking-wider text-gold font-bold">{user.role}</p>
            </div>
            <NotificationsBell direction="up" />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/hub/login" })}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-steel-100 hover:bg-white/5 min-h-[44px]"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* ---- Mobile top bar ---- */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-navy-900/95 px-4 backdrop-blur-sm">
        <Link href="/hub" className="leading-none">
          <span className="brand-wordmark text-base font-semibold text-white tracking-[0.14em]">{PRODUCT.wordmark}</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationsBell />
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-steel-100 hover:bg-white/5"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* ---- Mobile full menu ---- */}
      {menuOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 bg-navy/98 backdrop-blur-md overflow-y-auto">
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
            <span className="brand-wordmark text-base font-semibold text-white tracking-[0.14em]">MENU</span>
            <button
              aria-label="Close menu"
              onClick={closeAnd}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-steel-100 hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeAnd}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold min-h-[44px]",
                  isActive(pathname, item.href)
                    ? "bg-orange/15 text-white border border-orange/30"
                    : "text-steel-100 hover:bg-white/5 border border-transparent"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <div className="pt-3 mt-3 border-t border-white/10">
              <p className="px-4 text-sm font-semibold text-white">{user.name}</p>
              <p className="px-4 text-[11px] uppercase tracking-wider text-gold font-bold">{user.role}</p>
              <button
                onClick={() => signOut({ callbackUrl: "/hub/login" })}
                className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold text-steel-100 hover:bg-white/5 min-h-[44px]"
              >
                <LogOut className="h-5 w-5" /> Sign out
              </button>
            </div>
          </nav>
        </div>
      ) : null}

      {/* ---- Mobile bottom tabs ---- */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-navy-900/98 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {mobileTabs.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide",
                isActive(pathname, item.href) ? "text-gold" : "text-steel-300 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex min-h-[56px] flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide",
              moreItems.some((i) => isActive(pathname, i.href)) ? "text-gold" : "text-steel-300 hover:text-white"
            )}
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </>
  )
}
