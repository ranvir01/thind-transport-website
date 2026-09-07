"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { focusableWithin, nextFocusTarget } from "@/lib/focus-trap"
import {
  ChevronDown, Menu, X, Phone, FileText,
  DollarSign, Heart, MapPin, BookOpen, Users,
  Truck, Shield, ChevronRight, LayoutDashboard, Share2,
} from "lucide-react"
import { COMPANY_INFO, EQUIPMENT, PAY_RATES, STATS } from "@/lib/constants"
import { PersonaSwitcher } from "@/components/shared/PersonaSwitcher"

// Navigation items with dropdowns
const driverMenuItems = [
  {
    href: "/apply",
    label: "Apply Now",
    description: "Start your application",
    icon: FileText,
    highlight: true,
  },
  {
    href: "/jobs",
    label: "Open Jobs",
    description: "Local, regional, OTR, lease-on",
    icon: Truck,
  },
  {
    href: "/refer",
    label: "Send this job",
    description: "QR + copy for WhatsApp",
    icon: Share2,
  },
  {
    href: "/pay-rates",
    label: "Pay Rates",
    description: `${PAY_RATES.ownerOperator.commission} O/O split`,
    icon: DollarSign,
  },
  {
    href: "/benefits",
    label: "Benefits",
    // Not "full package" — we do not carry one, and the phrase is on the
    // banned-claims list. These three are the first three rows of
    // BENEFITS.companyDriver, named plainly.
    description: "Sign-on bonus, weekly pay, home time",
    icon: Heart,
  },
  {
    href: "/routes",
    label: "Routes",
    description: "Nationwide lanes",
    icon: MapPin,
  },
  {
    href: "/cdl-jobs",
    label: "Jobs by State",
    description: `Hiring in all ${STATS.statesCovered}`,
    icon: MapPin,
  },
  {
    href: "/resources",
    label: "Resources",
    description: "Driver tools",
    icon: BookOpen,
  },
]

const companyMenuItems = [
  {
    href: "/about",
    label: "About Us",
    description: `Family-run since ${COMPANY_INFO.founded}`,
    icon: Users,
  },
  {
    href: "/fleet",
    label: "Our Fleet",
    description: EQUIPMENT.short,
    icon: Truck,
  },
  {
    href: "/shippers",
    label: "Ship with us",
    description: "Freight quotes, direct",
    icon: Truck,
  },
  {
    href: "/brokers",
    label: "For brokers",
    description: "Carrier packet, authority, insurance",
    icon: Shield,
  },
  {
    href: "/loadoff",
    label: "LoadOff TMS",
    description: "The software we run on",
    icon: LayoutDashboard,
  },
  {
    href: "/veterans",
    label: "Veterans",
    description: "We honor service",
    icon: Shield,
  },
]

// Dropdown component for desktop
function DesktopDropdown({
  label,
  items,
  isOpen,
  onToggle,
  onClose,
}: {
  label: string
  items: typeof driverMenuItems
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKey)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKey)
    }
  }, [isOpen, onClose])

  // Check if any item in this menu is active
  const hasActiveItem = items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  )

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold transition-colors rounded-fleet
          ${
            hasActiveItem
              ? "text-orange-400 bg-steel-800/80"
              : "text-steel-200 hover:text-white hover:bg-steel-800/50"
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="chrome-panel-in absolute top-full left-0 mt-1 w-64 py-1 bg-navy border border-steel-700 rounded-fleet-lg shadow-m-e3 overflow-hidden">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 transition-all group
                    ${
                      item.highlight
                        ? "bg-orange-600/10 hover:bg-orange-500/20 border-l-2 border-orange-500"
                        : isActive
                          ? "bg-white/10 border-l-2 border-white"
                          : "hover:bg-white/5 border-l-2 border-transparent hover:border-white/30"
                    }
                  `}
              >
                <div
                  className={`p-2 rounded-m-2 transition-colors
                    ${
                      item.highlight
                        ? "bg-orange-600/20 text-orange-400"
                        : isActive
                          ? "bg-white/20 text-white"
                          : "bg-white/10 text-white/80 group-hover:bg-white/15 group-hover:text-white"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div
                    className={`text-m-body font-medium ${item.highlight ? "text-orange-300" : isActive ? "text-white" : "text-steel-100"}`}
                  >
                    {item.label}
                  </div>
                  <div className="text-m-micro text-steel-300">
                    {item.description}
                  </div>
                </div>
                {item.highlight && (
                  <ChevronRight className="w-4 h-4 text-orange-300 group-hover:translate-x-1 transition-transform" />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Mobile Menu Drawer
function MobileMenuDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Prevent body scroll when menu is open; Escape closes it; Tab stays inside.
  //
  // Without the trap, Tab walked out of the drawer into the page behind it —
  // still interactive, now invisible behind the backdrop — so a keyboard user
  // tabbed off the end of the menu and landed somewhere they could not see
  // (WCAG 2.4.3). Focus is moved in on open and restored to whatever opened the
  // drawer on close, so the menu button does not lose its place.
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = ""
      return
    }
    document.body.style.overflow = "hidden"
    const previouslyFocused = document.activeElement as HTMLElement | null

    // Focus the first thing in the drawer once it has mounted.
    const raf = requestAnimationFrame(() => {
      if (!drawerRef.current) return
      const focusables = focusableWithin(drawerRef.current)
      ;(focusables[0] ?? drawerRef.current).focus()
    })

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
        return
      }
      if (event.key !== "Tab" || !drawerRef.current) return
      // Re-queried per keypress: the accordion opens and closes while the
      // drawer is open, so a list captured at open time goes stale.
      const target = nextFocusTarget(
        focusableWithin(drawerRef.current),
        document.activeElement,
        event.shiftKey
      )
      if (target) {
        event.preventDefault()
        target.focus()
      }
    }

    document.addEventListener("keydown", handleKey)
    return () => {
      document.body.style.overflow = ""
      document.removeEventListener("keydown", handleKey)
      cancelAnimationFrame(raf)
      previouslyFocused?.focus?.()
    }
  }, [isOpen, onClose])

  return (
    <>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-navy-950/80 z-[101] motion-safe:animate-backdrop-in"
            onClick={onClose}
          />

          {/* Drawer.
              The edge is load-bearing, not decoration (WCAG 1.4.11, 3:1 to
              identify the component): the panel ground and the darkened
              backdrop are both near-black, so surface-vs-surface reads 1.07:1
              however they are mixed, and shadow-m-e* is a paper ladder that
              paints nothing here. So the boundary is the rule itself —
              border-steel-500 measures 3.47:1 against the composited backdrop
              and 3.23:1 against the panel, the lowest rung of the ramp that
              clears 3:1 on BOTH sides (white/10 reads 1.40, steel-600 2.40).
              The white/10 rules inside are dividers, a different job. */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            tabIndex={-1}
            className="chrome-drawer-in fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm border-l border-steel-500 bg-navy z-[102] flex flex-col shadow-m-e5"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <Link
                href="/"
                onClick={onClose}
                className="brand-wordmark text-3xl leading-none text-white"
              >
                THIND <span className="text-orange">TRANSPORT</span>
              </Link>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4">
              {/* Audience doors — the drawer's equivalent of the desktop
                  persona switcher; tapping any door also closes the drawer. */}
              <div className="px-4 mb-4" onClick={onClose}>
                <PersonaSwitcher className="flex w-fit" />
              </div>

              {/* Drivers Section */}
              <div className="px-4 mb-2">
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "drivers" ? null : "drivers",
                    )
                  }
                  className="w-full flex items-center justify-between py-3 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-steel-300"
                >
                  For Drivers
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedSection === "drivers" ? "rotate-180" : ""}`}
                  />
                </button>
                {expandedSection === "drivers" && (
                  <div className="overflow-hidden">
                    {driverMenuItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 py-3 px-2 rounded-fleet transition-all
                              ${
                                item.highlight
                                  ? "bg-orange-600/10 border border-orange-600/40"
                                  : isActive
                                    ? "bg-white/10"
                                    : "hover:bg-white/5"
                              }
                            `}
                        >
                          <div
                            className={`p-2.5 rounded-m-2
                              ${
                                item.highlight
                                  ? "bg-orange-600/20 text-orange-300"
                                  : isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-white/5 text-white/60"
                              }
                            `}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div
                              className={`font-medium ${item.highlight ? "text-orange-300" : isActive ? "text-white" : "text-steel-100"}`}
                            >
                              {item.label}
                            </div>
                            <div className="text-m-micro text-steel-300">
                              {item.description}
                            </div>
                          </div>
                          {item.highlight && (
                            <span className="rounded-full border border-orange-600/40 bg-orange-600/15 px-2 py-0.5 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                              Start
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Company Section */}
              <div className="px-4 mb-2">
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "company" ? null : "company",
                    )
                  }
                  className="w-full flex items-center justify-between py-3 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-steel-300"
                >
                  Company
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedSection === "company" ? "rotate-180" : ""}`}
                  />
                </button>
                {expandedSection === "company" && (
                  <div className="overflow-hidden">
                    {companyMenuItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 py-3 px-2 rounded-fleet transition-all
                              ${isActive ? "bg-white/10" : "hover:bg-white/5"}
                            `}
                        >
                          <div
                            className={`p-2.5 rounded-m-2 ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-steel-200"}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div
                              className={`font-medium ${isActive ? "text-white" : "text-steel-100"}`}
                            >
                              {item.label}
                            </div>
                            <div className="text-m-micro text-steel-300">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Quick Links */}
              <div className="px-4 pt-4 border-t border-white/10 mt-4">
                <Link
                  href="/driver/login"
                  onClick={onClose}
                  className={`flex items-center gap-3 py-3 px-2 rounded-fleet transition-all
                    ${pathname === "/driver/login" ? "bg-white/10" : "hover:bg-white/5"}
                  `}
                >
                  <div
                    className={`p-2.5 rounded-m-2 ${pathname === "/driver/login" ? "bg-white/20 text-white" : "bg-white/10 text-steel-200"}`}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div
                      className={`font-medium ${pathname === "/driver/login" ? "text-white" : "text-steel-100"}`}
                    >
                      Driver Login
                    </div>
                    <div className="text-m-micro text-steel-300">
                      Access your application
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/10 space-y-3 bg-navy-950">
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="flex min-h-[48px] items-center justify-center gap-2 w-full px-4 bg-white/5 hover:bg-white/10 rounded-fleet border border-white/15 text-white font-semibold transition-colors"
              >
                <Phone className="w-4 h-4" aria-hidden />
                <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
              </a>
              <Link
                href="/apply"
                onClick={onClose}
                className="flex min-h-[48px] items-center justify-center gap-2 w-full px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-fleet text-white font-semibold transition-colors"
              >
                Apply Now
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export const CinematicNavbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastYRef = useRef(0)
  const pathname = usePathname()
  const isHub = pathname.startsWith("/hub") || pathname.startsWith("/track")

  // Scroll behavior: shadow once moving, and auto-hide on scroll-down /
  // reveal on scroll-up past the hero — reading reclaims the top bar, and
  // the moment intent reverses (scroll up = "I want to navigate") it's back.
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      setScrolled(y > 50)
      const delta = y - lastYRef.current
      // Ignore sub-8px jitter (rubber-banding, precision trackpads).
      if (Math.abs(delta) > 8) {
        setHidden(delta > 0 && y > 160)
        lastYRef.current = y
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Never hide while a menu is open.
  const navHidden = hidden && !mobileMenuOpen && !activeDropdown

  // Close dropdowns on route change (state reset during render, no effect needed)
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setActiveDropdown(null)
    setMobileMenuOpen(false)
  }

  // The Hub has its own navigation shell.
  if (isHub) return null

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[100] border-b transition-[transform,box-shadow] duration-300 ${
          scrolled ? "border-steel-700 shadow-brand" : "border-steel-800/80"
        } ${navHidden ? "-translate-y-full" : "translate-y-0"} bg-navy/95`}
      >
        <div className="fleet-accent-line" />
        <nav className="container flex items-center justify-between gap-4 h-14 md:h-16">
          {/* Wordmark — understated text identity, not a boxed logo */}
          <Link
            href="/"
            className="relative z-20 hover:opacity-80 transition-opacity whitespace-nowrap leading-none flex items-center"
            data-cursor="HOME"
          >
            <span className="brand-wordmark text-lg md:text-xl font-bold leading-none text-white tracking-[0.14em]">
              THIND
              <span className="text-orange-400 font-semibold"> TRANSPORT</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <DesktopDropdown
              label="Drivers"
              items={driverMenuItems}
              isOpen={activeDropdown === "drivers"}
              onToggle={() =>
                setActiveDropdown(
                  activeDropdown === "drivers" ? null : "drivers",
                )
              }
              onClose={() => setActiveDropdown(null)}
            />

            <DesktopDropdown
              label="Company"
              items={companyMenuItems}
              isOpen={activeDropdown === "company"}
              onToggle={() =>
                setActiveDropdown(
                  activeDropdown === "company" ? null : "company",
                )
              }
              onClose={() => setActiveDropdown(null)}
            />

            <Link
              href="/driver/login"
              className={`px-3 py-2 text-sm font-semibold rounded-fleet transition-colors
                  ${
                    pathname === "/driver/login" ||
                    pathname.startsWith("/driver/")
                      ? "text-orange-400 bg-steel-800/80"
                      : "text-steel-200 hover:text-white hover:bg-steel-800/50"
                  }
                `}
              data-cursor="VIEW"
            >
              Portal
            </Link>

            {/* Persistent audience switcher — always visible so nobody is
                trapped in a lane; highlight keys off pathname, never a cookie
                (no hydration mismatch, no flash). lg+ only: at md the bar has
                no room and the drawer carries the same doors instead. */}
            <PersonaSwitcher className="ml-2 hidden lg:flex" />
          </div>

          {/* The call link, lg and up. The digits ARE the accessible name at
              every width. Below xl the bar has no room to paint them — the
              wordmark, two dropdowns, Portal, the four persona doors, this
              link and Apply already overrun the lg container once the digits
              are laid out — so they go sr-only rather than display:none. As
              display:none a bare Phone glyph (lucide sets no aria-hidden and
              no title) left the link with an EMPTY accessible name across the
              whole lg band, which no QA viewport exercises: design-qa samples
              mobile/tablet/desktop and viewport-matrix's laptop is the xl
              breakpoint itself. From xl the digits are visible text, sitting
              beside Apply the way the rest of the site prints a phone. */}
          <a
            href={`tel:${COMPANY_INFO.phoneFormatted}`}
            className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-steel-300 hover:text-orange-300 transition-colors"
            data-cursor="CALL"
          >
            <Phone className="w-4 h-4" aria-hidden />
            <span className="sr-only font-mono tabular-nums xl:not-sr-only">
              {COMPANY_INFO.phone}
            </span>
          </a>

          {/* Apply. md and up deliberately, not sm: MobileCommandBar's own
              filled-red Apply is md:hidden, so at sm both were fixed to the
              viewport at once. The two breakpoints are now complementary —
              exactly one red Apply is pinned at any width. */}
          <Link
            href="/apply"
            className="hidden md:flex min-h-[48px] items-center rounded-fleet bg-orange-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-700 active:bg-orange-800"
            data-cursor="APPLY"
          >
            Apply Now
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-fleet border border-steel-600 bg-steel-800/60 hover:bg-steel-700 text-white transition-colors flex items-center justify-center"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
        </nav>
      </header>

      {/* Mobile Menu Drawer */}
      <MobileMenuDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  )
}
