"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  COMPANY_INFO,
  MAJOR_CLIENTS,
  PREMIER_BROKERS,
  TRUST_INDICATORS,
} from "@/lib/constants"
import {
  Award,
  BadgeCheck,
  Package,
  Shield,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
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
    { href: "/testimonials", label: "Driver Reviews" },
    { href: "/resources", label: "Driver Resources" },
    { href: "/driver-portal", label: "Driver Portal" },
  ]
  
  const companyLinks = [
    { href: "/about", label: "About Us" },
    { href: "/showcase", label: "Our Fleet" },
    { href: "/veterans", label: "Veterans Program" },
    { href: "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx", label: "FMCSA Record", external: true },
  ]
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
      {/* For Drivers - Collapsible on Mobile */}
      <div className="border-b border-white/10 md:border-0">
        <button 
          onClick={() => toggleSection('drivers')}
          className="w-full flex items-center justify-between py-4 md:py-0 md:cursor-default min-h-[44px]"
        >
          <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-zinc-500">
            For Drivers
          </h4>
          <ChevronDown className={`w-5 h-5 text-zinc-500 md:hidden transition-transform duration-200 ${openSection === 'drivers' ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Mobile Collapsible */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${openSection === 'drivers' ? 'max-h-96 pb-4' : 'max-h-0'}`}>
          <ul className="space-y-3 text-sm pl-2">
            {driverLinks.map((link) => (
              <li key={link.href}>
                <Link 
                  href={link.href} 
                  className={`${link.highlight ? 'text-zinc-300 font-semibold' : 'text-zinc-400'} hover:text-orange-500 transition-colors flex items-center gap-2 group py-1`}
                >
                  <span className={`w-1 h-1 rounded-full ${link.highlight ? 'bg-orange-500' : 'bg-zinc-700'} group-hover:bg-orange-500 transition-all`} />
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
                className={`${link.highlight ? 'text-zinc-300 font-semibold' : 'text-zinc-400'} hover:text-orange-500 transition-colors flex items-center gap-2 group`}
              >
                <span className={`w-1 h-1 rounded-full ${link.highlight ? 'bg-orange-500' : 'bg-zinc-700'} group-hover:bg-orange-500 group-hover:scale-150 transition-all`} />
                <span className="group-hover:translate-x-1 transition-transform">{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Company - Collapsible on Mobile */}
      <div className="border-b border-white/10 md:border-0">
        <button 
          onClick={() => toggleSection('company')}
          className="w-full flex items-center justify-between py-4 md:py-0 md:cursor-default min-h-[44px]"
        >
          <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-zinc-500">
            Company
          </h4>
          <ChevronDown className={`w-5 h-5 text-zinc-500 md:hidden transition-transform duration-200 ${openSection === 'company' ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Mobile Collapsible */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${openSection === 'company' ? 'max-h-96 pb-4' : 'max-h-0'}`}>
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
                  <span className="group-hover:translate-x-1 transition-transform">{link.label}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <Link 
                  href={link.href}
                  className="text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-zinc-700 group-hover:bg-orange-500 transition-colors" />
                  <span className="group-hover:translate-x-1 transition-transform">{link.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>

        {/* Social Media Links */}
        <div className="mt-8">
          <h5 className="font-mono font-bold mb-4 text-xs uppercase tracking-widest text-zinc-500">Follow Us</h5>
          <div className="flex items-center gap-3">
            {[
              { href: "https://facebook.com", Icon: Facebook, label: "Facebook" },
              { href: "https://twitter.com", Icon: Twitter, label: "Twitter" },
              { href: "https://linkedin.com", Icon: Linkedin, label: "LinkedIn" },
              { href: "https://instagram.com", Icon: Instagram, label: "Instagram" }
            ].map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-orange-500 flex items-center justify-center transition-all group border border-white/5 hover:border-orange-400"
                aria-label={label}
              >
                <Icon className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// The floating command bar
export const CommandBar = () => {
  const pathname = usePathname()
  
  const navItems = [
    { name: 'Routes', href: '/routes' },
    { name: 'Pay', href: '/pay-rates' },
    { name: 'Portal', href: '/driver-portal' }
  ]
  
  return (
    <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 1, type: "spring", stiffness: 200, damping: 20 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] hidden md:flex items-center gap-2 p-2 bg-[#001F3F]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl ring-1 ring-white/5"
    >
        <div className="flex items-center gap-4 px-4 border-r border-white/10">
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] font-mono text-white/80 uppercase tracking-widest">USDOT #{COMPANY_INFO.dot}</span>
            </div>
        </div>

        <nav className="flex items-center gap-1 px-2">
            <Link 
                href="/apply" 
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(249,115,22,0.4)]
                  ${pathname === '/apply' 
                    ? 'bg-orange-600 text-white ring-2 ring-orange-400/50' 
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }
                `}
                data-cursor="APPLY"
            >
                Apply Now
            </Link>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link 
                    key={item.name}
                    href={item.href} 
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95
                      ${isActive 
                        ? 'bg-white/20 text-white ring-1 ring-white/30' 
                        : 'hover:bg-white/10 text-white/80 hover:text-white'
                      }
                    `}
                    data-cursor="VIEW"
                >
                    {item.name}
                </Link>
              )
            })}
        </nav>

        <div className="pl-2 border-l border-white/10">
            <a 
              href={`tel:${COMPANY_INFO.phoneFormatted}`} 
              className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all hover:-translate-y-0.5 active:translate-y-0" 
              data-cursor="CALL"
            >
                <Phone className="w-3 h-3" />
                <span>Recruiting</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
        </div>
    </motion.div>
  )
}

export const MobileCommandBar = () => {
  const pathname = usePathname()
  
  // Hide on Apply page
  if (pathname === '/apply') return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-gradient-to-t from-[#00060D] via-[#00060D]/98 to-[#00060D]/95 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
       <div className="flex gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <a 
            href={`tel:${COMPANY_INFO.phoneFormatted}`} 
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-semibold py-3.5 px-4 rounded-xl transition-all active:scale-[0.98]"
          >
             <Phone className="w-4 h-4" />
             <span className="text-sm">Call Now</span>
          </a>
          <Link 
            href="/apply" 
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:from-orange-700 active:to-orange-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/30 active:scale-[0.98]"
          >
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
             </span>
             <span className="text-sm">Apply Now</span>
          </Link>
       </div>
    </div>
  )
}

// The full revealed footer
export const CinematicFooter = () => {
  const certificationIconMap = {
    "shield-check": ShieldCheck,
    "badge-check": BadgeCheck,
    award: Award,
    shield: Shield,
  } as const

  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative w-full bg-[#00060D] text-white border-t border-white/5 pb-24 md:pb-0">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-navy-800 via-[#00060D] to-[#00060D] opacity-50" />
      
      {/* Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />

      {/* Main Footer Content */}
      <div className="relative z-10">
        <div className="container py-16 md:py-24">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {/* Company Info Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Image
                  src="/ar-carrier-logo.png"
                  alt={`${COMPANY_INFO.name} Logo`}
                  width={48}
                  height={48}
                  className="rounded-lg opacity-90"
                />
                <h3 className="text-xl font-bold text-white tracking-tight">{COMPANY_INFO.name}</h3>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Family-owned trucking company founded in {COMPANY_INFO.founded}. Over{" "}
                {COMPANY_INFO.ownerExperience} years of owner experience delivering
                nationwide freight.
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
                    <p className="text-xs text-zinc-400">24/7 Dispatch Support</p>
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
                    <p className="text-zinc-300 text-sm">{COMPANY_INFO.address}</p>
                    <p className="text-xs text-zinc-400">Mailing Address</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links Columns */}
            <FooterLinkSections />

            {/* Certifications & Trust Column */}
            <div>
              <h4 className="font-mono font-bold mb-6 text-xs uppercase tracking-widest text-zinc-500">
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
                             {cert.name.includes("Safety Rating") && <ExternalLink className="inline-block w-3 h-3 ml-1 text-zinc-500" />}
                        </div>
                        <div className="text-zinc-400 text-xs">{cert.issuer}</div>
                      </div>
                    </div>
                  )

                  return cert.name.includes("Safety Rating") ? (
                    <a key={cert.name} href="https://safer.fmcsa.dot.gov/CompanySnapshot.aspx" target="_blank" rel="noopener noreferrer">
                        {content}
                    </a>
                  ) : (
                    <div key={cert.name}>
                        {content}
                    </div>
                  )
                })}
              </div>

              {/* DOT/MC Info */}
              <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
                <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wider font-mono">Licensed & Insured</p>
                <div className="space-y-1 font-mono text-sm">
                  <p className="text-white">DOT# <span className="text-zinc-400">{COMPANY_INFO.dot}</span></p>
                  <p className="text-white">MC# <span className="text-zinc-400">{COMPANY_INFO.mc}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 border-t border-white/5 bg-[#00060D]">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-zinc-400">
              © {currentYear} {COMPANY_INFO.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-zinc-400 font-mono uppercase tracking-wider">
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
