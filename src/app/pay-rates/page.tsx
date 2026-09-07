import { Metadata } from "next"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { PayTable } from "@/components/features/PayTable"
import { JobDetailsDialog } from "@/components/features/JobDetailsDialog"
import { Reveal } from "@/components/ui/Reveal"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"

export const metadata: Metadata = {
  title: `Pay Rates — ${PAY_RATES.ownerOperator.commission} O/O Split, ${PAY_RATES.companyDriver.local.perMile}/mi Company | ${COMPANY_INFO.name}`,
  description: `What Thind Transport actually pays: owner-operators keep ${PAY_RATES.ownerOperator.commission} of gross with ${PAY_RATES.ownerOperator.fuelSurcharge} fuel surcharge (${PAY_RATES.ownerOperator.annualGross}/year typical). Company drivers ${PAY_RATES.companyDriver.local.perMile}/mile on every lane (${PAY_RATES.companyDriver.local.annual} local to ${PAY_RATES.companyDriver.otr.annual} OTR). Weekly pay, no hidden fees.`,
  alternates: { canonical: "/pay-rates" },
}

/**
 * The pay page IS the pay table — reworked 2026-08-28 (constraints 12–13,
 * docs/design/home-rework-2026-08.md + pay-story-variants.html). The previous
 * version sent drivers to the homepage calculator from its own hero, then
 * showed two MORE instruments below with hardcoded invented figures. Now:
 * one static table, every number from PAY_RATES, full job details behind the
 * two dialogs, done. Do not add a calculator back.
 */
export default function PayRatesPage() {
  return (
    <div className="bg-paper">
      <PageBreadcrumb pageName="Pay Rates" category="Drivers" />

      <AsphaltHero
        eyebrow="What we actually pay"
        title={`${PAY_RATES.companyDriver.local.perMile}/mile company. ${PAY_RATES.ownerOperator.commission} owner-op.`}
        description="The whole plan fits in one table — no sliders, no teaser math. Every number on this page is the same one you'll hear on the phone."
      />

      <section className="py-16 md:py-24">
        <div className="container px-4">
          <Reveal>
            <PayTable />
          </Reveal>
          <Reveal className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center gap-4">
            <JobDetailsDialog jobType="company" />
            <JobDetailsDialog jobType="owner" />
          </Reveal>
        </div>
      </section>

      <RelatedLinks
        title="The rest of the money picture"
        intro="Where the money goes after the table, and the records behind it."
        links={driverLinks(["/pay-rates"])}
      />
    </div>
  )
}
