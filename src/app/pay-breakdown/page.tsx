import { Metadata } from "next"
import Link from "next/link"
import { Fuel, Percent, Wallet } from "lucide-react"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"
import { Reveal } from "@/components/ui/Reveal"

export const metadata: Metadata = {
  title: `Owner Operator Pay Breakdown | ${PAY_RATES.ownerOperator.commission} Split Explained`,
  description: `Detailed explanation of how our ${PAY_RATES.ownerOperator.commission} split works. No hidden fees. ${PAY_RATES.ownerOperator.fuelSurcharge} fuel surcharge pass-through. See the math on every load.`,
  alternates: { canonical: "/pay-breakdown" },
}

const EXAMPLE_GROSS = 3000
const KEEP_PCT = Number.parseInt(PAY_RATES.ownerOperator.commission, 10)
const KEEP = (EXAMPLE_GROSS * KEEP_PCT) / 100
const FEE = EXAMPLE_GROSS - KEEP

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" })

const payRules = [
  {
    icon: Percent,
    title: "Linehaul",
    description: `You keep ${PAY_RATES.ownerOperator.commission} of the gross rate on every load.`,
  },
  {
    icon: Fuel,
    title: "Fuel surcharge",
    description: `${PAY_RATES.ownerOperator.fuelSurcharge} of fuel surcharges pass through to you.`,
  },
  {
    icon: Wallet,
    title: "Accessorials",
    description: `You keep ${PAY_RATES.ownerOperator.commission} of detention, layover, and stop pay.`,
  },
]

export default function PayBreakdownPage() {
  return (
    <div className="bg-paper">
      <AsphaltHero
        eyebrow="Owner operators"
        title={`The ${PAY_RATES.ownerOperator.commission} split, explained.`}
        description={`It's simple math, not magic. We take ${100 - KEEP_PCT}% for admin and dispatch — you keep ${PAY_RATES.ownerOperator.commission} and ${PAY_RATES.ownerOperator.fuelSurcharge} of fuel surcharges. Here's exactly how the money moves.`}
      />

      <section className="py-16 md:py-24">
        <div className="container mx-auto max-w-4xl px-4">
          <ul className="grid list-none gap-4 md:grid-cols-3">
            {payRules.map((rule, i) => {
              const Icon = rule.icon
              return (
                <Reveal as="li" key={rule.title} index={i} className="rounded-m-3 border border-ink/10 p-6">
                  <Icon className="h-5 w-5 text-signal" aria-hidden />
                  <h2 className="mt-3 font-display text-m-h4 font-bold text-ink">{rule.title}</h2>
                  <p className="mt-2 text-m-body text-ink-2">{rule.description}</p>
                </Reveal>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="border-t border-ink/10 py-16 md:py-24">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="font-display text-m-h2 font-bold text-ink">
            How does the {PAY_RATES.ownerOperator.commission} split work?
          </h2>
          <p className="mt-4 max-w-3xl text-m-body text-ink-2">
            We handle the billing, collections, and dispatching. You keep {PAY_RATES.ownerOperator.commission} of
            the linehaul. The example below is a labeled {usd(EXAMPLE_GROSS)} load — not a promised rate.
            The percentage is the one in the pay table.
          </p>

          <div className="mt-10 overflow-hidden rounded-m-3 border border-ink/10">
            <div className="bg-asphalt px-8 py-5">
              <h3 className="font-display text-m-h4 font-bold text-paper">Example load breakdown</h3>
            </div>
            <div className="grid items-center gap-8 bg-paper p-8 md:grid-cols-2">
              <div className="rounded-m-2 border border-ink/10 p-6 text-center">
                <p className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-3">
                  Total gross load
                </p>
                <p className="mt-2 font-display text-m-h1 font-bold text-ink">{usd(EXAMPLE_GROSS)}</p>
                <p className="mt-2 text-m-micro text-ink-3">Linehaul only — example</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                  <span className="text-m-body text-ink">Your share ({PAY_RATES.ownerOperator.commission})</span>
                  <span className="font-display text-m-h4 font-bold text-ink">{usd(KEEP)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-ink/10 pb-3 text-ink-2">
                  <span>Thind fee ({100 - KEEP_PCT}%)</span>
                  <span>{usd(FEE)}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-display text-m-h4 font-bold text-signal">You keep</span>
                  <span className="font-display text-m-h2 font-bold text-signal">{usd(KEEP)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 max-w-3xl">
            <h2 className="font-display text-m-h3 font-bold text-ink">
              Who gets the {PAY_RATES.ownerOperator.commission} split?
            </h2>
            <p className="mt-4 text-m-body text-ink-2">
              Every owner operator at Thind Transport. If you own the truck and do the driving, you keep
              the majority of the revenue. Questions? Call{" "}
              <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="font-semibold text-signal underline-offset-4 hover:underline">
                {COMPANY_INFO.phone}
              </a>
              , or read the{" "}
              <Link href="/pay-rates" className="font-semibold text-signal underline-offset-4 hover:underline">
                full pay table
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <RelatedLinks
        title="Check it yourself"
        intro="Every number above has a table or a record behind it."
        links={driverLinks(["/pay-breakdown"])}
      />
    </div>
  )
}
