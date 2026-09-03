import { Metadata } from "next"
import Link from "next/link"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"
import { Reveal } from "@/components/ui/Reveal"

const OO = PAY_RATES.ownerOperator

/** The fee is the other side of the published split, never typed twice. */
const KEEP_PCT = Number(OO.commission.replace("%", ""))
const FEE = `${100 - KEEP_PCT}%`

export const metadata: Metadata = {
  title: `Owner Operator Pay Breakdown | ${OO.commission} Split Explained`,
  description: `How the ${OO.commission} owner-operator split works line by line: linehaul, ${OO.fuelSurcharge} fuel surcharge pass-through, ${OO.commission} of detention and layover, and what comes out of a weekly settlement.`,
  alternates: { canonical: "/pay-breakdown" },
}

const usd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

/** One worked load, computed from the published split rather than typed. */
const EXAMPLE_GROSS = 3000
const EXAMPLE_KEEP = (EXAMPLE_GROSS * KEEP_PCT) / 100
const EXAMPLE_FEE = EXAMPLE_GROSS - EXAMPLE_KEEP

/** What you keep. Every share is a PAY_RATES figure, not a typed percentage. */
const ACCESSORIALS = [
  {
    line: "Linehaul",
    share: OO.commission,
    note: "Of the gross rate on every load. You see the rate confirmation, so you can check it.",
  },
  {
    line: "Fuel surcharge",
    share: OO.fuelSurcharge,
    note: "Passes through to you whole. We do not keep a slice of FSC.",
  },
  { line: "Detention", share: OO.commission, note: "Billed on the load, split the same way as the linehaul." },
  { line: "Layover", share: OO.commission, note: "Same split, on the same settlement line." },
  { line: "Stop pay", share: OO.commission, note: "Same split, on every extra stop." },
] as const

const TH = "px-3 py-3 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2"
const ROW_TH = "px-3 py-3 align-top text-m-body font-semibold text-ink"
const NUM = "px-3 py-3 align-top font-mono text-m-body font-semibold tabular-nums text-signal whitespace-nowrap"
const NOTE = "px-3 py-3 align-top text-m-body text-ink-2"
/** Zebra: an ink wash, not a second surface colour. */
const ZEBRA = "border-b border-ink/15 odd:bg-ink/[0.04]"

/**
 * /pay-breakdown — the settlement, line by line.
 *
 * Rebuilt onto the asphalt/paper grammar: the photo hero with its three
 * stacked navy gradients is an AsphaltHero, the worked load moved into the
 * hero's instrument pane, and the two blue-and-gray card grids became one
 * paper island holding a mono zebra table. Every percentage interpolates
 * PAY_RATES — nine of them were typed by hand, including the page title.
 *
 * The deductions live on /owner-operators and are linked, not restated:
 * two pages printing the same policy paragraph is how they drift apart.
 */
export default function PayBreakdownPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        eyebrow="Owner operators"
        title={`${OO.commission} of the linehaul, explained.`}
        description={`Simple math, not magic. We take ${FEE} for admin and dispatch — you keep ${OO.commission} of the linehaul and ${OO.fuelSurcharge} of the fuel surcharge. Here is exactly how the money moves.`}
      >
        {/* The worked load, as an instrument rather than a $3,000 headline in
            a gray box: mono figures, computed from the split above. */}
        <div className="rounded-m-3 border border-white/10 bg-white/5 p-6">
          <p className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
            One load, end to end
          </p>
          <dl className="mt-4">
            <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-m-body text-paper/70">Load pays</dt>
              <dd className="font-mono text-m-body tabular-nums text-paper">{usd(EXAMPLE_GROSS)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-3">
              <dt className="text-m-body text-paper/70">{`Our fee (${FEE})`}</dt>
              <dd className="font-mono text-m-body tabular-nums text-paper/70">{`−${usd(EXAMPLE_FEE)}`}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 pt-4">
              <dt className="text-m-body font-semibold text-paper">{`You keep (${OO.commission})`}</dt>
              <dd className="font-mono text-m-display font-bold tabular-nums text-signal-up">
                {usd(EXAMPLE_KEEP)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-m-micro text-paper/70">
            {`Linehaul only. The fuel surcharge on top of it passes through at ${OO.fuelSurcharge}.`}
          </p>
        </div>
      </AsphaltHero>

      <section aria-labelledby="settlement-heading" className="bg-navy-950 py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-4xl rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8">
            <h2 id="settlement-heading" className="font-display text-m-h2 font-bold text-ink text-balance">
              Line by line on a settlement
            </h2>
            <p className="mt-3 max-w-measure text-m-lede text-ink-2">
              We handle the billing, collections and dispatching. Everything below is what that leaves.
            </p>

            {/* The table is wider than the island at 390px and holds nothing
                focusable, so the scroller itself has to be a named stop —
                otherwise the third column is keyboard-unreachable. */}
            <div className="mt-8 overflow-x-auto" tabIndex={0} role="region" aria-label="What you keep">
              <table className="w-full min-w-[32rem] border-collapse text-left">
                <caption className="mb-2 text-left font-display text-m-h4 font-bold text-ink">
                  What you keep
                </caption>
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th scope="col" className={TH}>
                      Line
                    </th>
                    <th scope="col" className={TH}>
                      You keep
                    </th>
                    <th scope="col" className={TH}>
                      What it is
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ACCESSORIALS.map((row) => (
                    <tr key={row.line} className={ZEBRA}>
                      <th scope="row" className={ROW_TH}>
                        {row.line}
                      </th>
                      <td className={NUM}>{row.share}</td>
                      <td className={NOTE}>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-6 max-w-measure text-m-body text-ink-2">
              {`Deductions come off the same settlement, and only the lines you actually use appear on yours. Every one of them, alongside the ${FEE} fee above, is published on the owner-operator page.`}
            </p>
            <p className="mt-3">
              <Link
                href="/owner-operators"
                className="inline-flex min-h-[44px] items-center text-m-body font-semibold text-signal underline-offset-4 hover:underline"
              >
                Every deduction, before you sign
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* The page's ONE closing block. The old navy-photo CTA band with its
          two buttons and the duplicate "Calculate Your Pay" outline sat one
          scroll above this same offer. */}
      <section aria-labelledby="who-heading" className="bg-navy-950 py-section-tight text-white">
        <div className="container">
          <div className="mx-auto max-w-measure">
            <h2 id="who-heading" className="font-display text-m-h2 font-bold text-white text-balance">
              {`Who gets the ${OO.commission} split?`}
            </h2>
            <p className="mt-4 text-m-body text-steel-200">
              {`Every owner operator at ${COMPANY_INFO.name}. If you own the truck and do the driving, you keep the majority of the revenue — the same ${OO.commission} on your first load and your five-hundredth.`}
            </p>
            <p className="mt-8">
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="inline-flex min-h-[48px] items-center gap-2 text-m-lede font-semibold text-white underline-offset-4 hover:text-signal-up hover:underline"
              >
                <span>Call</span>
                <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
              </a>
            </p>
            <p className="mt-2">
              <Link
                href="/pay-rates#calculator"
                className="inline-flex min-h-[48px] items-center text-m-body font-semibold text-steel-200 underline-offset-4 hover:text-white hover:underline"
              >
                Or run the numbers on your own lanes
              </Link>
            </p>
          </div>
        </div>
      </section>

      <RelatedLinks
        tone="dark"
        title="Check it yourself"
        intro="Every number above has a tool or a record behind it."
        links={driverLinks(["/pay-breakdown"])}
      />
    </div>
  )
}
