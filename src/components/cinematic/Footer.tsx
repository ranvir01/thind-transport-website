"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { usePathname } from "next/navigation"
import { COMPANY_INFO, FMCSA_LINKS } from "@/lib/constants"
import { ChevronDown, ExternalLink, Mail, MapPin, Phone } from "lucide-react"

type FooterLink = { href: string; label: string; highlight?: boolean }

const FooterSection = ({
  title,
  links,
}: {
  title: string
  links: FooterLink[]
}) => (
  <details className="group border-b border-white/10 md:border-0 [&:not([open])>ul]:hidden md:[&:not([open])>ul]:block">
    <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between py-4 marker:content-none md:cursor-default md:py-0 md:pointer-events-none [&::-webkit-details-marker]:hidden">
      <h4 className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-steel-300">{title}</h4>
      <ChevronDown
        aria-hidden
        className="h-5 w-5 text-steel-400 transition-transform duration-base group-open:rotate-180 md:hidden"
      />
    </summary>
    <ul className="space-y-2 pb-4 text-m-body md:mt-5 md:pb-0">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className={`inline-flex items-center py-2 underline-offset-4 hover:underline ${
              link.highlight
                ? "font-semibold text-orange-300"
                : "text-steel-200 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </details>
)

// Two columns, one list each, rendered ONCE. On phones the section is a native
// <details> (no JS, no duplicated DOM — the old version shipped every link
// twice as md:hidden + hidden md:block copies and animated max-height, which
// clipped the list); from md the list is always open.
//
// Six routes each, the six the nav itself promotes. The footer used to carry
// sixteen links plus a certifications column plus a trust panel, which is a
// site map, not a footer: /app, /driver/login, /trust and the two FMCSA links
// are all still one click away from the nav, the related-links blocks, or the
// authority line below.
const FooterLinkSections = () => {
  const driverLinks: FooterLink[] = [
    { href: "/apply", label: "Apply", highlight: true },
    { href: "/jobs", label: "Open jobs" },
    { href: "/refer", label: "Refer a driver" },
    { href: "/pay-rates", label: "Pay rates" },
    { href: "/benefits", label: "Benefits" },
    { href: "/routes", label: "Routes and lanes" },
    { href: "/cdl-jobs", label: "Jobs by state" },
    { href: "/resources", label: "Driver resources" },
  ]

  const companyLinks: FooterLink[] = [
    { href: "/about", label: "About us" },
    { href: "/fleet", label: "Our fleet" },
    { href: "/shippers", label: "Ship with us" },
    { href: "/brokers", label: "For brokers" },
    { href: "/loadoff", label: "LoadOff TMS" },
    { href: "/contact", label: "Contact" },
  ]

  return (
    <div className="grid grid-cols-1 gap-0 md:col-span-2 md:grid-cols-2 md:gap-8">
      <FooterSection title="For drivers" links={driverLinks} />
      <FooterSection title="Company" links={companyLinks} />
    </div>
  )
}

// (Desktop floating command bar removed: it duplicated the navbar's Apply/
// Routes/Pay/Login + phone and floated over content on every page.)

// Hide on Apply page, in the Hub (own bottom navigation), and the legacy driver
// portal (its own submit buttons sit where this bar would land, per pitfall
// found 2026-07-22: it covered the register form's Create Account button)
//
// /pre-qualify is excluded for BOTH of those reasons at once. The bar floats
// over a nine-field multi-step form, and its one CTA is "Apply Now" pointing at
// /apply — so a driver halfway through pre-qualifying taps it, navigates away,
// and every answer is gone: the form holds its state in React with nothing
// persisted. /apply was excluded for exactly this and /pre-qualify was missed.
//
// The B2B and product pages are excluded because their one primary action is
// not the driver Apply: a shipper reading /shippers, a broker on /brokers, a
// carrier owner on /loadoff or someone booking a call on /schedule-meeting
// used to get a fixed red "Apply Now" competing with the page's own CTA.
const NOT_A_DRIVER_PAGE = new Set(["/shippers", "/brokers", "/quote", "/trust", "/loadoff", "/schedule-meeting"])

export const shouldHideMobileCommandBar = (pathname: string): boolean =>
  pathname === "/apply" ||
  pathname === "/pre-qualify" ||
  pathname === "/refer" ||
  pathname.startsWith("/jobs") ||
  pathname.startsWith("/hub") ||
  pathname.startsWith("/track") ||
  pathname.startsWith("/driver") ||
  NOT_A_DRIVER_PAGE.has(pathname)

/** The bar mounts once the hero has scrolled away; before that the hero's own CTA is the one red on screen. */
const PAST_HERO_PX = 420

export const MobileCommandBar = () => {
  const pathname = usePathname()
  const hide = shouldHideMobileCommandBar(pathname)
  const [pastHero, setPastHero] = useState(false)
  const [formInView, setFormInView] = useState(false)

  useEffect(() => {
    if (hide) return
    const onScroll = () => setPastHero(window.scrollY > Math.min(PAST_HERO_PX, window.innerHeight * 0.5))
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [hide, pathname])

  // Never float "Apply Now" over a form the visitor is filling in — the tap
  // navigates away and the form keeps its state in React only. Any <form> in
  // the main content counts (the inline application block, quote forms, the
  // calculator's email capture).
  useEffect(() => {
    if (hide || typeof IntersectionObserver === "undefined") return
    const forms = Array.from(document.querySelectorAll<HTMLFormElement>("main form"))
    if (forms.length === 0) return
    const visible = new Set<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target)
          else visible.delete(e.target)
        }
        setFormInView(visible.size > 0)
      },
      { rootMargin: "0px 0px -72px 0px", threshold: 0.05 }
    )
    forms.forEach((f) => observer.observe(f))
    return () => {
      observer.disconnect()
      // Leaving a page with forms must not keep the bar hidden on the next one.
      setFormInView(false)
    }
  }, [hide, pathname])

  if (hide || !pastHero || formInView) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] md:hidden border-t border-white/10 bg-navy-950/95 motion-safe:animate-slide-up">
      <div className="flex gap-2 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))]">
        <a
          href={`tel:${COMPANY_INFO.phoneFormatted}`}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-fleet border border-white/15 bg-white/5 px-3 font-semibold text-white transition-colors hover:bg-white/10 active:bg-white/15"
        >
          <Phone className="h-4 w-4" aria-hidden />
          <span className="text-sm">Call</span>
          <span className="font-mono text-sm tabular-nums text-steel-200">{COMPANY_INFO.phone}</span>
        </a>
        <Link
          href="/apply"
          className="flex min-h-[48px] flex-[1.2] items-center justify-center gap-2 rounded-fleet bg-orange-600 px-4 font-semibold text-white transition-colors hover:bg-orange-700 active:bg-orange-800"
        >
          <span className="text-sm">Apply Now</span>
        </Link>
      </div>
    </div>
  )
}

// The full revealed footer — name, address, phone, email; two link columns;
// the authority line with the record that proves it; the legal row. Everything
// else that used to live here (a mesh gradient, a noise overlay, a
// certifications column, an insurance-status panel and a services ticker) was
// decoration or a claim nothing in this repo evidences.
export const CinematicFooter = () => {
  const pathname = usePathname()
  if (pathname.startsWith("/hub") || pathname.startsWith("/track")) return null

  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-white/10 bg-navy-950 pb-24 text-white md:pb-0">
      <div className="container py-section">
        <div className="grid gap-10 md:grid-cols-3">
          {/* NAP — the four facts a search engine and a driver both need. */}
          <div className="space-y-5">
            <h3 className="brand-wordmark text-m-h4 leading-none text-white">
              {COMPANY_INFO.name}
            </h3>
            <address className="space-y-3 not-italic text-m-body text-steel-300">
              <span className="flex items-start gap-3">
                <MapPin aria-hidden className="mt-1 h-4 w-4 flex-shrink-0 text-steel-400" />
                <span>{COMPANY_INFO.address}</span>
              </span>
              <span className="flex items-center gap-3">
                <Phone aria-hidden className="h-4 w-4 flex-shrink-0 text-steel-400" />
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="font-semibold text-steel-200 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
                </a>
              </span>
              <span className="flex items-center gap-3">
                <Mail aria-hidden className="h-4 w-4 flex-shrink-0 text-steel-400" />
                <a
                  href={`mailto:${COMPANY_INFO.email}`}
                  className="break-all text-steel-200 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  {COMPANY_INFO.email}
                </a>
              </span>
            </address>
          </div>

          <FooterLinkSections />
        </div>

        {/* Authority, and the public record a reader can check it against. */}
        <p className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-6 text-m-body text-steel-300">
          <span className="font-mono tabular-nums">
            {`USDOT ${COMPANY_INFO.dot} · MC ${COMPANY_INFO.mc}`}
          </span>
          <a
            href={FMCSA_LINKS.safer}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-orange-300 underline-offset-4 hover:underline"
          >
            <span>Check our record on FMCSA SAFER</span>
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </a>
        </p>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-m-micro text-steel-300 sm:flex-row">
          <p>{`© ${currentYear} ${COMPANY_INFO.name}. All rights reserved.`}</p>
          <Link
            href="/privacy"
            className="font-semibold text-steel-200 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Privacy policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
