import Link from "next/link"
import { CinematicHero } from "@/components/cinematic/Hero"
import { AudienceSelector } from "@/components/home/AudienceSelector"
import { HomeTimeLanes } from "@/components/home/HomeTimeLanes"
import { FAQSection } from "@/components/home/FAQSection"
import { ThindPromise } from "@/components/home/ThindPromise"
import { OperationSection } from "@/components/home/OperationSection"
import { PhotoBand } from "@/components/home/PhotoBand"
import { DeferredApplicationForm, DeferredProfitCalculator } from "@/components/home/DeferredHomeSections"
import { WhySwitch } from "@/components/features/WhySwitch"
import { COMPANY_INFO, STATS } from "@/lib/constants"

/**
 * Homepage — nine sections, one primary CTA per viewport.
 *
 * Was fourteen: TrustStrip (its USDOT / MC / fleet figures now sit on the
 * hero's trust line), DispatchBand (folded into OperationSection), a second
 * PhotoBand, QuickQualify (a second apply entry one screen above the real
 * form) and the closing Ticker (a static row that read as a second footer)
 * are gone; RoutesSection + EquipmentSection became HomeTimeLanes. At 390px
 * the page dropped from ~21 phone screens to ~12.
 */
export default function Home() {
  return (
    <div className="brand-page-shell relative min-h-screen pb-24 selection:bg-orange-600 selection:text-white md:pb-0">
      <CinematicHero />

      {/* Three doors, immediately after the hero — see AudienceSelector for why
          this is inline rather than a blocking gate. */}
      <AudienceSelector />

      {/* The signature instrument: what you'd take home, on your numbers. */}
      <DeferredProfitCalculator />

      <WhySwitch />

      <PhotoBand
        src="/images/generated/fleet-lineup-kent.webp"
        alt="Illustration of Freightliner Cascadia tractors lined up in a yard"
        eyebrow={`${COMPANY_INFO.location} · Home yard`}
        headline={`${STATS.trucksInFleet} trucks. One family. Zero call centers.`}
      />

      <OperationSection />

      <HomeTimeLanes />

      <ThindPromise />

      <FAQSection />

      {/* The funnel form e2e-funnel-smoke pins. The fixed Call/Apply bar hides
          while this is in view so a thumb reaching for "Submit" never lands on
          a bar that navigates away (Footer.tsx, MobileCommandBar). */}
      <section id="apply" aria-labelledby="apply-heading" className="brand-section-panel py-section-tight md:py-section-loose">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-8 max-w-measure text-center">
              <span className="fleet-badge mb-4">Join the fleet</span>
              <h2 id="apply-heading" className="mb-4 text-white">
                Find the right fit
              </h2>
              <p className="text-lg text-steel-300">
                <span>
                  Company driver or owner-operator — we review your experience, equipment and lanes with you directly. Prefer to talk?{" "}
                </span>
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="inline-flex items-center font-semibold text-white underline-offset-4 hover:underline"
                >
                  <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
                </a>
              </p>
            </div>

            <div className="fleet-panel p-6 md:p-10" data-light>
              <DeferredApplicationForm />
            </div>

            <p className="mt-6 text-center text-sm text-steel-400">
              <span>Your information is secure and will only be used for recruitment purposes. </span>
              <Link href="/privacy" className="underline underline-offset-2 hover:text-white">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
