import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { AsphaltHero } from "@/components/shared/AsphaltHero"

/**
 * 404. An asphalt band like every other page's hero: one red action back to
 * the homepage, the number beside it as text, then the three pages people
 * actually mistype their way toward.
 *
 * "Road Not Found!" is load-bearing and stays verbatim — three e2e scripts
 * match on it (scripts/e2e-public-smoke.mjs and scripts/e2e-sweep.mjs treat it
 * as a dead-screen marker, scripts/e2e-tenant-isolation-smoke.mjs asserts a
 * cross-tenant probe lands here).
 */
const POPULAR = [
  { href: "/pay-rates", label: "Driver pay rates and calculator" },
  { href: "/apply", label: "Start an application" },
  { href: "/contact", label: "Contact us" },
] as const

export default function NotFound() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        eyebrow="404"
        title="Road Not Found!"
        description="This route isn't on our map yet. Here's the way back — or call the office and we'll point you at the right page."
        applyHref="/"
        applyLabel="Back to home"
      />

      <section aria-labelledby="popular-heading" className="bg-navy-950 py-section">
        <div className="container">
          <div className="mx-auto max-w-measure">
            <h2
              id="popular-heading"
              className="font-display text-m-h3 font-bold text-white text-balance"
            >
              Pages people usually want
            </h2>
            <ul className="mt-6 list-none space-y-2">
              {POPULAR.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-[44px] items-center gap-2 text-m-body font-semibold text-white underline-offset-4 hover:text-orange-300 hover:underline"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
