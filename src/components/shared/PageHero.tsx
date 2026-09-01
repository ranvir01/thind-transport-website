import Image from "next/image"
import Link from "next/link"
import { Phone, ArrowRight } from "lucide-react"
import { ReactNode } from "react"
import { COMPANY_INFO } from "@/lib/constants"

interface PageHeroProps {
  image: string
  imageAlt: string
  eyebrow: string
  title: ReactNode
  description: string
  primaryHref?: string
  primaryLabel?: string
  /** Hide the secondary phone CTA (defaults to shown). */
  hidePhone?: boolean
  /** Optional extra content rendered under the CTAs (e.g. fact chips). */
  children?: ReactNode
}

/**
 * Shared marketing page hero: full-bleed photo, left-aligned headline,
 * short description, one primary CTA + phone. Keeps every inner page on
 * the same confident template.
 */
export function PageHero({
  image,
  imageAlt,
  eyebrow,
  title,
  description,
  primaryHref = "/apply",
  primaryLabel = "Apply Now",
  hidePhone = false,
  children,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-navy py-20 text-white md:py-32">
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/80 to-navy/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-navy/30" />

      <div className="container relative z-10 px-4">
        <div className="max-w-2xl">
          <p className="mb-4 font-display text-xs font-bold uppercase tracking-[0.3em] text-orange-400">
            {eyebrow}
          </p>
          <h1 className="mb-5 text-4xl font-black leading-[1.08] tracking-tight md:text-6xl">
            {title}
          </h1>
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/90 md:text-xl">
            {description}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={primaryHref}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-8 py-4 font-bold text-white transition-colors hover:bg-orange-500"
            >
              {primaryLabel}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            {!hidePhone && (
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-8 py-4 font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Phone className="h-5 w-5" />
                {COMPANY_INFO.phone}
              </a>
            )}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}
