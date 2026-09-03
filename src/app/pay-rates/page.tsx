import { Metadata } from "next"
import { ProfitCalculator } from "@/components/features/ProfitCalculator"
import { PayTable } from "@/components/features/PayTable"
import { JobDetailsDialog } from "@/components/features/JobDetailsDialog"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"
import { Reveal } from "@/components/ui/Reveal"

const OO = PAY_RATES.ownerOperator
const CD = PAY_RATES.companyDriver

export const metadata: Metadata = {
  title: `Pay rates — ${OO.commission} owner-operator split, ${CD.regional.perMile}/mile company`,
  description: `Transparent trucking pay: Owner Operators keep ${OO.commission} gross (${OO.annualGross}/year). Company Drivers ${CD.regional.perMile}/mi (${CD.regional.annual}/year). Weekly pay, no hidden fees.`,
  keywords: [
    "truck driver pay rates",
    "owner operator commission",
    "CDL driver salary",
    "trucking company pay",
    "90 percent trucking",
    "truck driver weekly pay",
    "OTR driver income",
    "flatbed driver pay",
    "reefer driver pay",
  ],
  openGraph: {
    title: `Truck Driver Pay Rates - ${OO.commission} O/O | ${COMPANY_INFO.name}`,
    description: `Owner Operators: ${OO.commission} gross. Company Drivers: ${CD.regional.perMile}/mi. No hidden fees. Weekly pay. See exactly what you'll earn.`,
    url: "https://thindtransport.com/pay-rates",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Truck Driver Pay Rates | ${COMPANY_INFO.name}`,
    description: `${OO.commission} commission for O/O • ${CD.regional.perMile}/mi for company • Weekly pay • No hidden fees`,
  },
  alternates: {
    canonical: "https://thindtransport.com/pay-rates",
  },
}

/**
 * /pay-rates — the published rate, then the driver's own miles.
 *
 * Two instruments, in that order: PayTable is what we pay (static, straight
 * out of PAY_RATES, readable in a yard on a phone), and ProfitCalculator is
 * what a given week comes to. The four gradient position cards that used to
 * sit between them published the same four numbers a third time in blue and
 * amber, so they are gone; their JobDetailsDialog triggers survive as text
 * links under the table, which is where a driver asks "what else is in this
 * seat?". PayRateVisualizations went with them — four bar charts of the same
 * ranges the table above already prints.
 */
export default function PayRatesPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        breadcrumb={
          /* The trail lives inside the asphalt band; its own bar chrome
             (opaque ground, blur, nav-clearance padding, centred row, second
             gutter) is overridden here rather than stacked above the hero. */
          <PageBreadcrumb
            pageName="Pay Rates"
            category="Drivers"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="What we actually pay"
        title="The published rate, then your own miles."
        description={`${OO.commission} of the linehaul for owner-operators, ${CD.regional.perMile} a mile for company drivers. No hidden fees, no surprises at the first settlement.`}
        extraLinks={[{ href: "#calculator", label: "Run your own numbers" }]}
      />

      <section aria-labelledby="pay-by-lane-heading" className="bg-navy-950 py-section">
        <div className="container">
          {/* The page's one paper island: dense published data, on paper, the
              way a rate confirmation reads. The calculator below it is a dark
              band, so no two paper islands touch. */}
          <Reveal className="mx-auto max-w-4xl rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8">
            <h2
              id="pay-by-lane-heading"
              className="font-display text-m-h2 font-bold text-ink text-balance"
            >
              Pay by lane
            </h2>
            <p className="mt-3 max-w-measure text-m-lede text-ink-2">
              This table is the rate we publish; the calculator below is your miles.
            </p>

            <div className="mt-8">
              <PayTable />
            </div>

            {/* Everything else in each seat — requirements, benefits, route
                options — behind the two dialogs, not a second card grid. */}
            <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center gap-x-8 gap-y-1 border-t border-ink/15 pt-4 text-ink">
              <JobDetailsDialog jobType="company" />
              <JobDetailsDialog jobType="owner" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* One instrument site-wide: the same calculator the homepage and
          /drivers render, reading the same constants. It brings its own dark
          band, heading and apply block, so this page adds neither. */}
      <div id="calculator" className="scroll-mt-24">
        <ProfitCalculator />
      </div>

      <RelatedLinks
        tone="dark"
        title="The rest of the money picture"
        intro="Where the money goes after the calculator, and the records behind it."
        links={driverLinks(["/pay-rates"])}
      />
    </div>
  )
}
