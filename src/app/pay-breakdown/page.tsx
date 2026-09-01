import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Fuel, Percent, Wallet } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"

export const metadata: Metadata = {
  title: "Owner Operator Pay Breakdown | 90% Split Explained",
  description: "How the 90% owner-operator split works line by line: linehaul, 100% fuel surcharge pass-through, 90% of detention and layover, and what comes out of a weekly settlement.",
  alternates: { canonical: "/pay-breakdown" },
}

const payRules = [
  {
    icon: Percent,
    title: "Linehaul",
    description: "You keep 90% of the gross rate on every load.",
  },
  {
    icon: Fuel,
    title: "Fuel surcharge",
    description: "100% of fuel surcharges pass through to you.",
  },
  {
    icon: Wallet,
    title: "Accessorials",
    description: "You keep 90% of detention, layover, and stop pay.",
  },
]

export default function PayBreakdownPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero band */}
      <section className="relative overflow-hidden bg-navy pb-20 pt-32 text-white md:pb-28 md:pt-40">
        <Image
          src="/images/generated/truck-night-highway.webp"
          alt="Illustration of a tractor-trailer running a night highway lane"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/55 to-navy/95" />
        <div className="container relative mx-auto max-w-4xl px-4">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-orange-400">Owner Operators</p>
          <h1 className="mb-6 text-4xl font-black leading-tight md:text-6xl">
            The 90% Split, <span className="text-orange">Explained</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-white/90 md:text-xl">
            It&apos;s simple math, not magic. We take 10% for admin and dispatch — you keep 90% and
            100% of fuel surcharges. Here&apos;s exactly how the money moves.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-orange/40 bg-navy/60 px-5 py-4 backdrop-blur-sm">
            <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-orange" />
            <p className="font-semibold text-white">
              The golden rule: if the load pays $1,000, you get $900. Period.
            </p>
          </div>
        </div>
      </section>

      {/* The three pay rules */}
      <section className="relative z-10 -mt-10 pb-4">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="grid gap-4 md:grid-cols-3">
            {payRules.map((rule) => {
              const Icon = rule.icon
              return (
                <div key={rule.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange/10">
                    <Icon className="h-5 w-5 text-orange-600" />
                  </div>
                  <h2 className="mb-1 text-lg font-bold text-navy">{rule.title}</h2>
                  <p className="text-sm leading-relaxed text-gray-600">{rule.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works + example */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-4 text-3xl font-black text-navy">How does the 90% split work?</h2>
          <p className="mb-10 max-w-3xl leading-relaxed text-gray-700">
            We handle the billing, collections and dispatching, and take 10% of the linehaul for it.
            Everything below is what that leaves on a real settlement.
          </p>

          <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-xl shadow-navy/5">
            <div className="bg-navy px-8 py-5">
              <h3 className="text-xl font-bold text-white">Example load breakdown</h3>
            </div>
            <div className="grid items-center gap-8 bg-white p-8 md:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-6 text-center">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-gray-500">Total Gross Load</p>
                <p className="text-5xl font-black text-navy">$3,000</p>
                <p className="mt-2 text-xs text-gray-500">Linehaul only</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="font-medium text-gray-700">Your share (90%)</span>
                  <span className="text-lg font-bold text-navy">$2,700.00</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 text-gray-500">
                  <span>Thind fee (10%)</span>
                  <span>$300.00</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-black text-orange-600">You keep</span>
                  <span className="text-3xl font-black text-orange-600">$2,700.00</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 max-w-3xl">
            <h2 className="mb-4 text-2xl font-bold text-navy">Who gets the 90% split?</h2>
            <p className="leading-relaxed text-gray-700">
              Every owner operator at Thind Transport. We believe that if you own the truck and do the
              driving, you should keep the majority of the revenue. This structure is designed to help
              owner operators succeed in volatile markets by maximizing revenue per mile.
            </p>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative overflow-hidden bg-navy py-16 md:py-20">
        <Image
          src="/images/generated/driver-cab-interior.webp"
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/85 to-navy/60" />
        <div className="container relative mx-auto max-w-4xl px-4">
          <h2 className="mb-3 text-3xl font-black text-white md:text-4xl">Ready to start earning more?</h2>
          <p className="mb-8 max-w-xl text-lg text-white/90">
            Run the numbers on your own lanes, or start the conversation with an application.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/apply"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-8 py-4 font-bold text-white transition-colors hover:bg-orange-600"
            >
              Apply Now
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/#calculator"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 py-4 font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Calculate Your Pay
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/70">
            Questions? Call <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="font-semibold text-white underline">{COMPANY_INFO.phone}</a> — a real person answers.
          </p>
        </div>
      </section>

      <RelatedLinks
        title="Check it yourself"
        intro="Every number above has a tool or a record behind it."
        links={driverLinks(["/pay-breakdown"])}
      />
    </div>
  )
}
