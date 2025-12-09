import Link from "next/link"
import Image from "next/image"
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
} from "lucide-react"

export function Footer() {
  const certificationIconMap = {
    "shield-check": ShieldCheck,
    "badge-check": BadgeCheck,
    award: Award,
    shield: Shield,
  } as const

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gradient-to-br from-red-900 via-red-800 to-amber-900 text-white">
      {/* Main Footer Content */}
      <div className="border-t border-red-700/50">
        <div className="container py-16">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {/* Company Info Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/ar-carrier-logo.png"
                  alt={`${COMPANY_INFO.name} Logo`}
                  width={48}
                  height={48}
                  className="rounded-lg"
                />
                <h3 className="text-xl font-bold text-white">{COMPANY_INFO.name}</h3>
              </div>
              <p className="text-neutral-300 text-sm leading-relaxed">
                Family-owned trucking company founded in {COMPANY_INFO.founded}. Over{" "}
                {COMPANY_INFO.ownerExperience} years of owner experience delivering
                nationwide freight.
              </p>
              
              {/* Contact Info */}
              <div className="space-y-3 pt-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-yellow-300 mt-1 flex-shrink-0" />
                  <div>
                    <a
                      href={`tel:${COMPANY_INFO.phoneFormatted}`}
                      className="text-neutral-200 hover:text-yellow-300 transition-colors font-medium"
                    >
                      {COMPANY_INFO.phone}
                    </a>
                    <p className="text-xs text-neutral-400">24/7 Dispatch Support</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-yellow-300 mt-1 flex-shrink-0" />
                  <div>
                    <a
                      href={`mailto:${COMPANY_INFO.email}`}
                      className="text-neutral-200 hover:text-yellow-300 transition-colors font-medium break-all"
                    >
                      {COMPANY_INFO.email}
                    </a>
                    <p className="text-xs text-neutral-400">Email Us Anytime</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-yellow-300 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-neutral-200 text-sm">{COMPANY_INFO.address}</p>
                    <p className="text-xs text-neutral-400">Mailing Address</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links Column */}
            <div>
              <h4 className="font-semibold mb-6 uppercase text-sm tracking-wide text-neutral-300">
                Quick Links
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/" className="text-neutral-300 hover:text-yellow-300 transition-colors flex items-center gap-2 group">
                    <span className="group-hover:translate-x-1 transition-transform">Home</span>
                  </Link>
                </li>
                <li>
                  <Link href="/pay-rates" className="text-neutral-300 hover:text-yellow-300 transition-colors flex items-center gap-2 group">
                    <span className="group-hover:translate-x-1 transition-transform">Pay Rates & Benefits</span>
                  </Link>
                </li>
                <li>
                  <Link href="/load-board" className="text-neutral-300 hover:text-yellow-300 transition-colors flex items-center gap-2 group">
                    <span className="group-hover:translate-x-1 transition-transform">Load Board</span>
                  </Link>
                </li>
                <li>
                  <Link href="/routes" className="text-neutral-300 hover:text-yellow-300 transition-colors flex items-center gap-2 group">
                    <span className="group-hover:translate-x-1 transition-transform">Routes</span>
                  </Link>
                </li>
                <li>
                  <Link href="/testimonials" className="text-neutral-300 hover:text-yellow-300 transition-colors flex items-center gap-2 group">
                    <span className="group-hover:translate-x-1 transition-transform">Driver Reviews</span>
                  </Link>
                </li>
                <li>
                  <Link href="/driver-portal" className="text-neutral-300 hover:text-yellow-300 transition-colors flex items-center gap-2 group">
                    <span className="group-hover:translate-x-1 transition-transform">Driver Portal</span>
                  </Link>
                </li>
                <li>
                  <Link href="/pre-qualify" className="text-neutral-300 hover:text-yellow-300 transition-colors flex items-center gap-2 group">
                    <span className="group-hover:translate-x-1 transition-transform">Pre-Qualify</span>
                  </Link>
                </li>
                <li>
                  <Link href="/apply" className="text-neutral-200 hover:text-yellow-300 transition-colors flex items-center gap-2 group font-semibold">
                    <span className="group-hover:translate-x-1 transition-transform">Apply Now</span>
                  </Link>
                </li>
              </ul>

              {/* Social Media Links */}
              <div className="mt-8">
                <h5 className="font-semibold mb-4 text-sm text-neutral-300">Follow Us</h5>
                <div className="flex items-center gap-3">
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-red-800/50 hover:bg-yellow-500 flex items-center justify-center transition-colors group"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-4 w-4 text-neutral-300 group-hover:text-gray-900" />
                  </a>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-red-800/50 hover:bg-yellow-500 flex items-center justify-center transition-colors group"
                    aria-label="Twitter"
                  >
                    <Twitter className="h-4 w-4 text-neutral-300 group-hover:text-gray-900" />
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-red-800/50 hover:bg-yellow-500 flex items-center justify-center transition-colors group"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-4 w-4 text-neutral-300 group-hover:text-gray-900" />
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-red-800/50 hover:bg-yellow-500 flex items-center justify-center transition-colors group"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-4 w-4 text-neutral-300 group-hover:text-gray-900" />
                  </a>
                </div>
              </div>
            </div>

            {/* Certifications & Trust Column */}
            <div>
              <h4 className="font-semibold mb-6 uppercase text-sm tracking-wide text-neutral-300">
                Certifications & Safety
              </h4>
              <div className="space-y-4 text-sm">
                {TRUST_INDICATORS.certifications.map((cert) => {
                  const Icon =
                    certificationIconMap[
                      cert.icon as keyof typeof certificationIconMap
                    ] ?? ShieldCheck

                  return (
                    <div key={cert.name} className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 text-yellow-300 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-white text-sm">{cert.name}</div>
                        <div className="text-neutral-400 text-xs">{cert.issuer}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* DOT/MC Info */}
              <div className="mt-8 p-4 bg-red-800/50 rounded-lg border border-red-700/50">
                <p className="text-xs text-neutral-300 mb-2">Licensed & Insured</p>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">DOT# {COMPANY_INFO.dot}</p>
                  <p className="text-sm font-semibold text-white">MC# {COMPANY_INFO.mc}</p>
                </div>
              </div>
            </div>

            {/* Premier Partners Column */}
            <div>
              <h4 className="font-semibold mb-6 uppercase text-sm tracking-wide text-neutral-300">
                Premier Partners
              </h4>
              <div className="space-y-4 text-sm">
                {PREMIER_BROKERS.slice(0, 4).map((broker) => (
                  <div key={broker.name} className="flex items-start gap-3">
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 text-yellow-300 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-white text-sm">{broker.name}</div>
                        <div className="text-neutral-400 text-xs">{broker.tier}</div>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-8">
                <h5 className="font-semibold mb-4 text-sm text-neutral-300">Fortune 500 Clients</h5>
                <div className="space-y-3 text-sm">
                  {MAJOR_CLIENTS.slice(0, 3).map((client) => (
                    <div key={client.name} className="flex items-start gap-3">
                      <Package className="mt-0.5 h-3.5 w-3.5 text-yellow-300 flex-shrink-0" />
                      <div>
                        <div className="text-neutral-200 text-sm">{client.name}</div>
                        <div className="text-xs text-neutral-400">
                          {client.duration}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-red-700/50 bg-gradient-to-r from-red-950 via-red-900 to-amber-950">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-neutral-400">
              © {currentYear} {COMPANY_INFO.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-neutral-400">
              <span>Flatbed • Reefer • Dry Van</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Nationwide Service</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Action Button - Mobile Only */}
      <a
        href={`tel:${COMPANY_INFO.phoneFormatted}`}
        className="fab md:hidden bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700"
        aria-label="Call Now"
      >
        <Phone className="w-5 h-5 text-gray-900" />
      </a>
    </footer>
  )
}

