import { Metadata } from "next"
import Image from "next/image"
import { TestimonialsCarousel } from "@/components/shared/TestimonialsCarousel"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { COMPANY_INFO, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { PageHero } from "@/components/shared/PageHero"
import { Users, TrendingUp, Heart, ArrowRight, Phone } from "lucide-react"

export const metadata: Metadata = {
  title: `Driver Reviews & Testimonials | ${COMPANY_INFO.name}`,
  description:
    "What company drivers and owner operators say about driving for Thind Transport — straight talk on the 90% split, dispatch, equipment, and home time.",
  alternates: { canonical: "/testimonials" },
}

const themes = [
  {
    icon: Heart,
    title: "Family culture",
    body: "Drivers consistently tell us the same thing: dispatch knows their name, their lanes, and their home-time needs. We're small enough to care and organized enough to deliver.",
  },
  {
    icon: TrendingUp,
    title: "Transparent pay",
    body: "The 90% split is the headline, but what keeps drivers here is that settlements match the rate confirmation — every week, no hidden deductions.",
  },
  {
    icon: Users,
    title: "Dispatch that answers",
    body: "No phone trees, no overseas queue. When you call, you reach someone in Kent, WA who can actually solve your problem — days, nights, and weekends.",
  },
]

export default function TestimonialsPage() {
  return (
    <div className="brand-page-shell min-h-screen">
      <PageBreadcrumb pageName="Testimonials" category="Drivers" />

      {/* Hero */}
      <PageHero
        image="/images/generated/fleet-kent-wa.png"
        imageAlt="Thind Transport trucks at the Kent, Washington home base"
        eyebrow="Driver Feedback"
        title={
          <>
            Straight talk from <span className="text-orange">our drivers</span>
          </>
        }
        description="No inflated numbers, no stock-photo drivers. Here's what the people who run our freight say about the split, the dispatch, and the equipment."
        primaryLabel="Start Your Application"
      />

      {/* Testimonials Carousel */}
      <section className="py-16 md:py-20">
        <div className="container px-4">
          <TestimonialsCarousel />
          <p className="mt-6 text-center text-xs text-steel-400 max-w-xl mx-auto">
            Quotes are shared with drivers&apos; permission and lightly edited for length. Want to talk to a
            current driver before you commit? Ask recruiting — we&apos;ll connect you.
          </p>
        </div>
      </section>

      {/* What drivers consistently say */}
      <section className="py-16 md:py-20 brand-section-panel border-t border-steel-800">
        <div className="container px-4">
          <div className="fleet-section-heading">
            <span className="fleet-badge mb-4">Common threads</span>
            <h2 className="text-white mb-4">
              What drivers <span className="text-orange">consistently</span> tell us
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {themes.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="fleet-panel p-7">
                  <div className="w-12 h-12 rounded-lg bg-orange/15 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-orange" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-steel-300 text-sm leading-relaxed">{item.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-16 md:py-24 border-t border-steel-800">
        <Image
          src="/images/generated/driver-pretrip-walkaround.webp"
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-navy-900/85" />
        <div className="container relative px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-white mb-4">
              See it for <span className="text-orange">yourself</span>
            </h2>
            <p className="text-lg text-steel-300 mb-8 max-w-2xl mx-auto">
              {STATS.trucksInFleet}+ trucks, {new Date().getFullYear() - COMPANY_INFO.founded} years out of Kent,
              WA, and a 60-second application. The fastest way to know if we&apos;re a fit is a conversation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-orange-600 text-white hover:bg-orange-500 font-bold text-lg h-14 px-10 shadow-cta hover:shadow-cta-hover transition-all"
              >
                <Link href="/apply">
                  Start Your Application
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-steel-600 bg-steel-800/40 text-white hover:bg-steel-700/60 hover:text-white font-bold text-lg h-14 px-10"
              >
                <a href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                  <Phone className="mr-2 h-5 w-5" />
                  Call {COMPANY_INFO.phone}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
