import { CinematicHero } from "@/components/cinematic/Hero"
import { AudienceSelector } from "@/components/home/AudienceSelector"
import { InfiniteTicker } from "@/components/cinematic/Ticker"
import { RoutesSection } from "@/components/home/RoutesSection"
import { EquipmentSection } from "@/components/home/EquipmentSection"
import { FAQSection } from "@/components/home/FAQSection"
import { TrustStrip } from "@/components/home/TrustStrip"
import { ThindPromise } from "@/components/home/ThindPromise"
import { OperationSection } from "@/components/home/OperationSection"
import { DispatchBand } from "@/components/home/DispatchBand"
import { PhotoBand } from "@/components/home/PhotoBand"
import { DeferredApplicationForm, DeferredProfitCalculator, DeferredQuickQualify } from "@/components/home/DeferredHomeSections"
import { WhySwitch } from "@/components/features/WhySwitch"
import Link from "next/link"

export default function Home() {
  return (
    <div className="brand-page-shell relative min-h-screen selection:bg-orange-600 selection:text-white pb-24 md:pb-0">
      <CinematicHero />

      {/* Three doors, immediately after the hero — see AudienceSelector for why
          this is inline rather than a blocking gate. */}
      <AudienceSelector />

      <TrustStrip />

      <div className="mb-12 md:mb-20">
        <DeferredProfitCalculator />
      </div>

      <WhySwitch />

      <PhotoBand
        src="/images/generated/fleet-lineup-kent.webp"
        alt="Thind Transport Freightliner Cascadias lined up at the Kent, WA yard"
        eyebrow="Kent, WA · Home yard"
        headline="15 trucks. One family. Zero call centers."
      />

      <OperationSection />

      <DispatchBand />

      <ThindPromise />

      <PhotoBand
        src="/images/generated/truck-mountain-pass.webp"
        alt="Thind Transport truck crossing a mountain pass at golden hour"
        eyebrow="All 48 states"
        headline="The lanes you know. The miles you want."
      />

      <RoutesSection />

      <EquipmentSection />
      <DeferredQuickQualify />
      <FAQSection />

      <section className="brand-section-panel py-20 md:py-28 relative overflow-hidden border-t border-steel-800">
        <div className="container px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="fleet-section-heading">
              <span className="fleet-badge mb-4">Join the fleet</span>
              <h2 className="text-white mb-4">
                Find the right <span className="text-orange">fit</span>
              </h2>
              <p className="text-lg text-steel-300 max-w-2xl mx-auto">
                Company driver or owner-operator — we&apos;ll review your experience, equipment, and lanes with you directly.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <a 
                href="tel:+12067656300"
                className="flex items-center gap-2 px-6 py-3 border border-steel-600 bg-steel-800/50 rounded-fleet text-white font-semibold hover:border-orange/50 hover:text-orange transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call: (206) 765-6300
              </a>
              <a 
                href="mailto:thindcarrier@gmail.com"
                className="flex items-center gap-2 px-6 py-3 border border-steel-600 bg-steel-800/50 rounded-fleet text-white font-semibold hover:border-orange/50 hover:text-orange transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Us
              </a>
            </div>

            <div className="fleet-panel overflow-hidden p-6 md:p-10 border-steel-600" data-light>
              <DeferredApplicationForm />
            </div>

            <p className="text-center text-steel-400 text-sm mt-6">
              Your information is secure and will only be used for recruitment purposes.
              <Link href="/privacy" className="underline ml-1 hover:text-white/90">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </section>

      <InfiniteTicker />
    </div>
  )
}
