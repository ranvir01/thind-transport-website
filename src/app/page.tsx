import { CinematicHero } from "@/components/cinematic/Hero"
import { InfiniteTicker } from "@/components/cinematic/Ticker"
import { RoutesSection } from "@/components/home/RoutesSection"
import { EquipmentSection } from "@/components/home/EquipmentSection"
import { FAQSection } from "@/components/home/FAQSection"
import { SuccessStoriesSection } from "@/components/home/SuccessStoriesSection"
import { ApplicationForm } from "@/components/application/ApplicationForm"
import { ProfitCalculator } from "@/components/features/ProfitCalculator"
import { QuickQualify } from "@/components/features/QuickQualify"
import { WhySwitch } from "@/components/features/WhySwitch"
import Link from "next/link"

export default function Home() {
  return (
    <main className="brand-page-shell relative min-h-screen selection:bg-orange selection:text-white pb-24 md:pb-0">
      <CinematicHero />

      <div className="mb-12 md:mb-20">
        <ProfitCalculator />
      </div>

      <WhySwitch />

      <SuccessStoriesSection />

      <RoutesSection />

      <EquipmentSection />
      <QuickQualify />
      <FAQSection />

      <section className="brand-section-panel py-20 md:py-28 bg-navy relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-orange/20 text-orange font-semibold text-sm mb-4">
                Talk With Our Team
              </span>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                Explore the Right <span className="text-orange">Fit</span>
              </h2>
              <p className="text-lg text-white/90 max-w-2xl mx-auto">
                Whether you are looking at company driver openings or owner-operator opportunities, we can review experience, equipment, and next steps with you directly.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <a 
                href="tel:+12067656300"
                className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-semibold hover:bg-white/20 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call: (206) 765-6300
              </a>
              <a 
                href="mailto:thindcarrier@gmail.com"
                className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-semibold hover:bg-white/20 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Us
              </a>
            </div>

            <div className="bg-white rounded-2xl shadow-brand-lg overflow-hidden p-6 md:p-10" data-light>
              <ApplicationForm />
            </div>

            <p className="text-center text-white/70 text-sm mt-6">
              Your information is secure and will only be used for recruitment purposes.
              <Link href="/privacy" className="underline ml-1 hover:text-white/90">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </section>

      <div className="bg-navy border-t border-white/10">
        <InfiniteTicker />
      </div>
    </main>
  )
}
