"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { usePathname } from "next/navigation"
import { COMPANY_INFO, SUPPORT, TRUST_INDICATORS } from "@/lib/constants"
import {
  Award,
  BadgeCheck,
  Shield,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ChevronDown,
} from "lucide-react"

const FooterSection = ({
  title,
  links,
}: {
  title: string
  links: { href: string; label: string; highlight?: boolean; external?: boolean }[]
}) => (
  <details className="group border-b border-white/10 md:border-0 [&:not([open])>ul]:hidden md:[&:not([open])>ul]:block">
    <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between py-4 marker:content-none md:cursor-default md:py-0 md:pointer-events-none [&::-webkit-details-marker]:hidden">
      <h4 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-steel-300">{title}</h4>
      <ChevronDown
        aria-hidden
        className="h-5 w-5 text-steel-400 transition-transform duration-200 group-open:rotate-180 md:hidden"
      />
    </summary>
    <ul className="space-y-3 pb-4 pl-2 text-sm md:mt-6 md:pb-0 md:pl-0">
      {links.map((link) => (
        <li key={link.href}>
          {link.external ? (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link flex items-center gap-2 py-1 text-steel-300 transition-colors hover:text-orange-400"
            >
              <span className="h-1 w-1 rounded-full bg-steel-600 transition-colors group-hover/link:bg-orange-400" />
              <span>{link.label}</span>
              <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
            </a>
          ) : (
            <Link
              href={link.href}
              className={`group/link flex items-center gap-2 py-1 transition-colors hover:text-orange-400 ${
                link.highlight ? "font-semibold text-steel-100" : "text-steel-300"
              }`}
            >
              <span
                className={`h-1 w-1 rounded-full transition-colors group-hover/link:bg-orange-400 ${
                  link.highlight ? "bg-orange-600" : "bg-steel-600"
                }`}
              />
              <span>{link.label}</span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  </details>
)

// Footer link sections: one list each, rendered ONCE. On phones the section is
// a native <details> (no JS, no duplicated DOM — the old version shipped every
// link twice as md:hidden + hidden md:block copies and animated max-height,
// which clipped the eight-item driver list); from md the list is always open.
const FooterLinkSections = () => {
  const driverLinks = [
    { href: "/apply", label: "Apply Now", highlight: true },
    { href: "/pay-rates", label: "Pay Rates" },
    { href: "/benefits", label: "Benefits" },
    { href: "/routes", label: "Routes & Lanes" },
    { href: "/resources", label: "Driver Resources" },
    { href: "/cdl-jobs", label: "Jobs by State" },
    { href: "/app", label: "Get the Driver App" },
    { href: "/driver/login", label: "Driver Login" },
  ]

  const companyLinks = [
    { href: "/about", label: "About Us" },
    { href: "/fleet", label: "Our Fleet" },
    { href: "/shippers", label: "Ship With Us" },
    { href: "/brokers", label: "For Brokers" },
    { href: "/loadoff", label: "LoadOff TMS" },
    { href: "/veterans", label: "Veterans Program" },
    {
      href: "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx",
      label: "FMCSA SAFER Record",
      external: true,
    },
    {
      href: "https://www.fmcsa.dot.gov/registration/whats-coming",
      label: "FMCSA Motus (Registration)",
      external: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-8">
      <FooterSection title="For Drivers" links={driverLinks} />
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
    <div className="fixed bottom-0 left-0 right-0 z-[90] md:hidden border-t border-white/10 bg-navy-950/95 supports-[backdrop-filter]:bg-navy-950/85 supports-[backdrop-filter]:backdrop-blur-md motion-safe:animate-slide-up">
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
          className="flex min-h-[48px] flex-[1.2] items-center justify-center gap-2 rounded-fleet bg-orange-600 px-4 font-semibold text-white transition-colors hover:bg-orange-500 active:bg-orange-700"
        >
          <span className="text-sm">Apply Now</span>
        </Link>
      </div>
    </div>
  )
}

// The full revealed footer
export const CinematicFooter = () => {
  const pathname = usePathname()
  if (pathname.startsWith("/hub") || pathname.startsWith("/track")) return null

  const certificationIconMap = {
    "shield-check": ShieldCheck,
    "badge-check": BadgeCheck,
    award: Award,
    shield: Shield,
  } as const

  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative w-full bg-navy-950 text-white border-t border-white/5 pb-24 md:pb-0">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-navy-800 via-navy-950 to-navy-950 opacity-50" />

      {/* Noise Overlay — inline SVG turbulence, no external request */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" />

      {/* Main Footer Content */}
      <div className="relative z-10">
        <div className="container py-16 md:py-24">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {/* Company Info Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <h3 className="brand-wordmark text-3xl leading-none text-white">
                  {COMPANY_INFO.name}
                </h3>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Family-owned trucking company founded in {COMPANY_INFO.founded}.
                Over {COMPANY_INFO.ownerExperience} years of owner experience
                delivering nationwide freight.
              </p>

              {/* Contact Info */}
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <a
                      href={`tel:${COMPANY_INFO.phoneFormatted}`}
                      className="text-zinc-300 hover:text-orange-500 transition-colors font-medium"
                    >
                      {COMPANY_INFO.phone}
                    </a>
                    <p className="text-xs text-zinc-400">
                      {SUPPORT.dispatch}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <a
                      href={`mailto:${COMPANY_INFO.email}`}
                      className="text-zinc-300 hover:text-orange-500 transition-colors font-medium break-all"
                    >
                      {COMPANY_INFO.email}
                    </a>
                    <p className="text-xs text-zinc-400">Email Us Anytime</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-zinc-300 text-sm">
                      {COMPANY_INFO.address}
                    </p>
                    <p className="text-xs text-zinc-400">Mailing Address</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links Columns */}
            <FooterLinkSections />

            {/* Certifications & Trust Column */}
            <div>
              <h4 className="font-display font-bold mb-6 text-sm uppercase tracking-[0.18em] text-steel-300">
                Certifications & Safety
              </h4>
              <div className="space-y-4 text-sm">
                {TRUST_INDICATORS.certifications.map((cert) => {
                  const Icon =
                    certificationIconMap[
                      cert.icon as keyof typeof certificationIconMap
                    ] ?? ShieldCheck

                  const href = "href" in cert ? cert.href : undefined
                  const content = (
                    <div
                      className={`flex items-start gap-3 ${href ? "group cursor-pointer" : ""}`}
                    >
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-400 transition-colors group-hover:text-orange-400" />
                      <div>
                        <div className="font-medium text-zinc-200 text-sm group-hover:text-white transition-colors">
                          {cert.name}
                          {href && (
                            <ExternalLink className="inline-block w-3 h-3 ml-1 text-zinc-500" />
                          )}
                        </div>
                        <div className="text-zinc-400 text-xs">
                          {cert.issuer}
                        </div>
                      </div>
                    </div>
                  )

                  return href ? (
                    <a key={cert.name} href={href} target="_blank" rel="noopener noreferrer">
                      {content}
                    </a>
                  ) : (
                    <div key={cert.name}>{content}</div>
                  )
                })}
              </div>

              {/* DOT/MC Info */}
              <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
                <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wider font-display">
                  Licensed & Insured
                </p>
                <div className="space-y-1 font-display text-sm tracking-[0.08em]">
                  <p className="text-white">
                    DOT#{" "}
                    <span className="text-zinc-400">{COMPANY_INFO.dot}</span>
                  </p>
                  <p className="text-white">
                    MC-<span className="text-zinc-400">{COMPANY_INFO.mc}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 border-t border-white/5 bg-navy-950">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-zinc-400">
              © {currentYear} {COMPANY_INFO.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-zinc-400 font-display uppercase tracking-[0.18em]">
              <span>Flatbed • Reefer • Dry Van</span>
              <span className="hidden sm:inline text-zinc-500">|</span>
              <span className="hidden sm:inline">Nationwide Service</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
