"use client"

import { useState } from "react"
import Link from "next/link"

import { usePathname } from "next/navigation"
import { COMPANY_INFO, TRUST_INDICATORS } from "@/lib/constants"
import {
  Award,
  BadgeCheck,
  MessageSquare,
  Shield,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ChevronDown,
} from "lucide-react"

// Collapsible footer link section for mobile
const FooterLinkSections = () => {
  const [openSection, setOpenSection] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
      {/* For Drivers - Collapsible on Mobile */}
      <div className="border-b border-white/10 md:border-0">
        <button
          onClick={() => toggleSection("drivers")}
          className="w-full flex items-center justify-between py-4 md:py-0 md:cursor-default min-h-[44px]"
        >
          <h4 className="font-display font-bold text-sm uppercase tracking-[0.18em] text-steel-300">
            For Drivers
          </h4>
          <ChevronDown
            className={`w-5 h-5 text-zinc-500 md:hidden transition-transform duration-200 ${openSection === "drivers" ? "rotate-180" : ""}`}
          />
        </button>

        {/* Mobile Collapsible */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${openSection === "drivers" ? "max-h-96 pb-4" : "max-h-0"}`}
        >
          <ul className="space-y-3 text-sm pl-2">
            {driverLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`${link.highlight ? "text-steel-100 font-semibold" : "text-steel-300"} hover:text-orange-500 transition-colors flex items-center gap-2 group py-1`}
                >
                  <span
                    className={`w-1 h-1 rounded-full ${link.highlight ? "bg-orange-600" : "bg-zinc-700"} group-hover:bg-orange-500 transition-all`}
                  />
                  <span>{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop Always Visible */}
        <ul className="hidden md:block space-y-3 text-sm mt-6">
          {driverLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`${link.highlight ? "text-zinc-300 font-semibold" : "text-zinc-400"} hover:text-orange-500 transition-colors flex items-center gap-2 group`}
              >
                <span
                  className={`w-1 h-1 rounded-full ${link.highlight ? "bg-orange-600" : "bg-zinc-700"} group-hover:bg-orange-500 group-hover:scale-150 transition-all`}
                />
                <span className="group-hover:translate-x-1 transition-transform">
                  {link.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Company - Collapsible on Mobile */}
      <div className="border-b border-white/10 md:border-0">
        <button
          onClick={() => toggleSection("company")}
          className="w-full flex items-center justify-between py-4 md:py-0 md:cursor-default min-h-[44px]"
        >
          <h4 className="font-display font-bold text-sm uppercase tracking-[0.18em] text-steel-300">
            Company
          </h4>
          <ChevronDown
            className={`w-5 h-5 text-zinc-500 md:hidden transition-transform duration-200 ${openSection === "company" ? "rotate-180" : ""}`}
          />
        </button>

        {/* Mobile Collapsible */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${openSection === "company" ? "max-h-96 pb-4" : "max-h-0"}`}
        >
          <ul className="space-y-3 text-sm pl-2">
            {companyLinks.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-2 group py-1"
                  >
                    <span className="w-1 h-1 rounded-full bg-zinc-700 group-hover:bg-orange-500 transition-colors" />
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    className="text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-2 group py-1"
                  >
                    <span className="w-1 h-1 rounded-full bg-zinc-700 group-hover:bg-orange-500 transition-colors" />
                    <span>{link.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop Always Visible */}
        <ul className="hidden md:block space-y-3 text-sm mt-6">
          {companyLinks.map((link) => (
            <li key={link.href}>
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-zinc-700 group-hover:bg-orange-500 transition-colors" />
                  <span className="group-hover:translate-x-1 transition-transform">
                    {link.label}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <Link
                  href={link.href}
                  className="text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-zinc-700 group-hover:bg-orange-500 transition-colors" />
                  <span className="group-hover:translate-x-1 transition-transform">
                    {link.label}
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// (Desktop floating command bar removed: it duplicated the navbar's Apply/
// Routes/Pay/Login + phone and floated over content on every page.)

// Hide on Apply page, in the Hub (own bottom navigation), and the legacy driver
// portal (its own submit buttons sit where this bar would land, per pitfall
// found 2026-07-22: it covered the register form's Create Account button)
export const shouldHideMobileCommandBar = (pathname: string): boolean =>
  pathname === "/apply" ||
  pathname.startsWith("/hub") ||
  pathname.startsWith("/track") ||
  pathname.startsWith("/driver")

export const MobileCommandBar = () => {
  const pathname = usePathname()

  if (shouldHideMobileCommandBar(pathname)) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-gradient-to-t from-[#060607] via-[#060607]/98 to-[#060607]/95 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
      <div className="flex gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <a
          href={`tel:${COMPANY_INFO.phoneFormatted}`}
          className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-semibold py-3.5 px-2 rounded-xl transition-all active:scale-[0.98]"
        >
          <Phone className="w-4 h-4" />
          <span className="text-sm">Call</span>
        </a>
        <a
          href={`sms:${COMPANY_INFO.phoneFormatted}?body=${encodeURIComponent("Hi, I'm interested in driving for Thind Transport.")}`}
          className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-semibold py-3.5 px-2 rounded-xl transition-all active:scale-[0.98]"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">Text</span>
        </a>
        <Link
          href="/apply"
          className="flex-[1.4] flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:from-orange-700 active:to-orange-800 text-white font-bold py-3.5 px-3 rounded-xl transition-all shadow-lg shadow-orange-500/30 active:scale-[0.98]"
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
    <footer className="relative w-full bg-[#060607] text-white border-t border-white/5 pb-24 md:pb-0">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-navy-800 via-[#060607] to-[#060607] opacity-50" />

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
                      24/7 Dispatch Support
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

                  const content = (
                    <div className="flex items-start gap-3 group cursor-pointer">
                      <Icon className="mt-0.5 h-4 w-4 text-zinc-600 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                      <div>
                        <div className="font-medium text-zinc-200 text-sm group-hover:text-white transition-colors">
                          {cert.name}
                          {cert.name.includes("Safety Rating") && (
                            <ExternalLink className="inline-block w-3 h-3 ml-1 text-zinc-500" />
                          )}
                        </div>
                        <div className="text-zinc-400 text-xs">
                          {cert.issuer}
                        </div>
                      </div>
                    </div>
                  )

                  return cert.name.includes("Safety Rating") ? (
                    <a
                      key={cert.name}
                      href="https://safer.fmcsa.dot.gov/CompanySnapshot.aspx"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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
      <div className="relative z-10 border-t border-white/5 bg-[#060607]">
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
