import { Metadata } from "next"
import Link from "next/link"
import {
  BadgeCheck, Calculator, FileText, Fuel, Phone, Receipt, ShieldCheck, Wallet,
} from "lucide-react"
import { COMPANY_INFO, PAY_RATES, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { PersonaRemember } from "@/components/shared/PersonaRemember"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"

export const metadata: Metadata = {
  title: "Owner Operators | 90% of the Linehaul, 100% of the Fuel Surcharge",
  description:
    "Lease on with Thind Transport in Kent, WA. 90% of the linehaul, 100% of the fuel surcharge, and a settlement statement that shows every deduction line by line. No forced dispatch. USDOT 2523064, MC 876103.",
  alternates: { canonical: "/owner-operators" },
}

const OO = PAY_RATES.ownerOperator

/**
 * Owner-operators are buying an arrangement, not a job — so the page leads
 * with the split and the deductions rather than with home time and benefits.
 * Every figure comes from PAY_RATES so this page cannot drift away from
 * /pay-rates the way the site's earnings copy has before.
 */
const TERMS = [
  {
    icon: Wallet,
    label: "Your split",
    value: OO.commission,
    detail: "of the linehaul on every load. You see the rate confirmation, so you can check the math on any load you haul.",
  },
  {
    icon: Fuel,
    label: "Fuel surcharge",
    value: OO.fuelSurcharge,
    detail: "passes through to you. We don't keep a slice of FSC — it exists to cover your fuel, not to pad ours.",
  },
  {
    icon: Calculator,
    label: "Typical gross",
    value: OO.annualGross,
    detail: `a year, working out to roughly ${OO.perMile} a mile depending on the lanes you take.`,
  },
  {
    icon: BadgeCheck,
    label: "Sign-on",
    value: OO.signOnBonus,
    detail: "for owner-operators, paid on the schedule we'll put in writing before you sign anything.",
  },
] as const

const DEDUCTIONS = [
  { name: "Insurance", note: "Occupational accident and physical damage, at our fleet rate — usually below what an individual can buy." },
  { name: "Escrow", note: "Held against damage and shortages, refundable when you leave in good standing. The balance shows on every settlement." },
  { name: "Fuel card", note: "Optional. Our discount at the pump, deducted at cost — we do not mark it up." },
  { name: "Trailer rental", note: "Only if you use ours. Bring your own and this line doesn't exist." },
] as const

const FAQ = [
  {
    q: "Is there forced dispatch?",
    a: "No. You see the load, the rate, and the lane before you accept it. Turning one down doesn't cost you your place in line — if it did, the 90% split wouldn't mean much.",
  },
  {
    q: "How often do I get paid, and how fast?",
    a: "Weekly settlements. If you want it faster on a specific load, ask about advances — we'll tell you the fee up front rather than burying it in a deduction.",
  },
  {
    q: "What do I need to lease on?",
    a: `A valid CDL, ${PAY_RATES.requirements.otr}, your own tractor with current registration and inspection, and the insurance we'll walk you through. We run flatbed, reefer, and dry van across ${STATS.statesCovered} states.`,
  },
  {
    q: "Can I see a real settlement statement before I commit?",
    a: "Yes — ask and we'll show you a real one with the numbers changed. Anyone who won't show you the statement before you sign is telling you something.",
  },
  {
    q: "Do you offer lease-purchase?",
    a: "Talk to us directly. We'd rather have that conversation on the phone with real numbers for your situation than publish terms that turn out not to apply to you.",
  },
] as const

export default function OwnerOperatorsPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PersonaRemember persona="owner-operators" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <PageBreadcrumb pageName="Owner Operators" category="Drivers" />

      {/* Hero */}
      <div className="bg-[#060607] text-white">
        <div className="container px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <span className="fleet-badge fleet-badge-gold mb-5">Lease on · Kent, WA</span>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-5">
              {OO.commission} of the linehaul.{" "}
              <span className="text-orange">A settlement you can audit.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-2xl">
              You already know what a bad lease looks like — a good percentage on paper and a settlement
              full of lines nobody will explain. Here is the split, here are every one of the deductions,
              and here is the statement you&apos;ll get every week.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/apply"
                className="rounded-full bg-orange-600 px-6 py-3.5 font-bold uppercase tracking-wide text-white shadow-cta transition-all hover:bg-orange-500"
              >
                Start your application
              </Link>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Phone className="h-4 w-4" aria-hidden /> {COMPANY_INFO.phone}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* The terms */}
      <div className="container px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">The arrangement</h2>
        <p className="text-gray-600 mb-8 max-w-2xl">
          Four numbers. If a recruiter anywhere else won&apos;t give you all four on the first call, that
          is the answer.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {TERMS.map(({ icon: Icon, label, value, detail }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5">
              <Icon className="h-6 w-6 text-orange-600 mb-3" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</p>
              <p className="text-3xl font-black text-gray-900 my-1">{value}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Deductions — the trust lever */}
      <div className="border-t border-gray-200 bg-white">
        <div className="container px-4 py-12 md:py-16">
          <div className="max-w-3xl">
            <Receipt className="h-7 w-7 text-orange-600 mb-3" aria-hidden />
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
              Every deduction, before you sign
            </h2>
            <p className="text-gray-600 mb-8">
              This is the part most carriers make you find out about on your third settlement. There are
              four, and only the ones you actually use appear on your statement.
            </p>
            <ul className="space-y-4">
              {DEDUCTIONS.map((d) => (
                <li key={d.name} className="rounded-2xl border border-gray-200 p-5">
                  <p className="font-bold text-gray-900 mb-1">{d.name}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{d.note}</p>
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <FileText className="h-6 w-6 text-orange-600 mb-3" aria-hidden />
              <p className="font-bold text-gray-900 mb-1">You get the same screen we do</p>
              <p className="text-gray-600 text-sm leading-relaxed">
                Settlements run in our own system, LoadOff. Each one lists the loads, the linehaul, the
                fuel surcharge, and every deduction as its own line — not one lump sum labelled
                &ldquo;expenses.&rdquo; Your escrow balance is on there too, every week, so you always
                know what you&apos;d get back.
              </p>
              <Link
                href="/pay-breakdown"
                className="mt-3 inline-block text-sm font-semibold text-orange-600 hover:underline"
              >
                See how the pay breaks down →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Credibility */}
      <div className="border-t border-gray-200">
        <div className="container px-4 py-12 md:py-16">
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl">
            {[
              {
                icon: ShieldCheck,
                title: "Verify us first",
                text: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}. Authority, insurance, and safety in one place — check it before you talk to us.`,
                href: "/trust",
                cta: "See our credentials",
              },
              {
                icon: Fuel,
                title: "Fuel program",
                text: "Our discount at the pump, passed through at cost. No markup, no rebate we keep.",
                href: "/fuel-program",
                cta: "How the fuel card works",
              },
              {
                icon: Calculator,
                title: "Run your own numbers",
                text: "Put your miles, your rate, and your fuel price in and see what a week actually clears.",
                href: "/pay-rates",
                cta: "Open the calculator",
              },
            ].map(({ icon: Icon, title, text, href, cta }) => (
              <div key={title} className="rounded-2xl border border-gray-200 bg-white p-5">
                <Icon className="h-6 w-6 text-orange-600 mb-3" aria-hidden />
                <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-3">{text}</p>
                <Link href={href} className="text-sm font-semibold text-orange-600 hover:underline">
                  {cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-gray-200 bg-white">
        <div className="container px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-8">Straight answers</h2>
          <div className="grid gap-5 md:grid-cols-2 max-w-5xl">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-2xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-gray-200 bg-[#060607] text-white">
        <div className="container px-4 py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-black mb-3">Bring your truck. Keep {OO.commission}.</h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-7">
            {STATS.trucksInFleet} trucks out of Kent, Washington, family-owned since {COMPANY_INFO.founded}.
            Call and ask us anything — including the questions this page didn&apos;t answer.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/apply"
              className="rounded-full bg-orange-600 px-7 py-3.5 font-bold uppercase tracking-wide text-white shadow-cta transition-all hover:bg-orange-500"
            >
              Start your application
            </Link>
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Phone className="h-4 w-4" aria-hidden /> {COMPANY_INFO.phone}
            </a>
          </div>
          <p className="mt-6 text-sm text-white/60">
            Company driver instead?{" "}
            <Link href="/drivers" className="font-medium text-orange-400 hover:underline">
              See company driver pay
            </Link>
          </p>
        </div>
      </div>

      <RelatedLinks
        title="Run the numbers yourself"
        intro="Nothing on this page is a claim you can't check with a tool on this site."
        links={driverLinks(["/owner-operators"])}
      />
    </div>
  )
}
