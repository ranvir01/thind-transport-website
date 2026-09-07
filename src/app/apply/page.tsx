import { Metadata } from "next"
import { ApplicationForm } from "@/components/application/ApplicationForm"
import { COMPANY_INFO, PAY_RATES, BENEFITS, WORKPLACE } from "@/lib/constants"
import { FAQAccordion } from "@/components/shared/FAQAccordion"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import {
  buildCompanyDriverJobPosting,
  buildOwnerOperatorJobPosting,
} from "@/lib/job-posting"
import { recruitingShareTags } from "@/lib/recruiting-posts"

export const metadata: Metadata = recruitingShareTags({
  title: `Apply Now | ${COMPANY_INFO.name}`,
  description: `Apply for a CDL-A seat with ${COMPANY_INFO.name} in ${COMPANY_INFO.location}. Company drivers ${PAY_RATES.companyDriver.local.perMile}/mile. Owner-operators keep ${PAY_RATES.ownerOperator.commission} of gross. Call ${COMPANY_INFO.phone}.`,
  path: "/apply",
})

const companyJobPosting = buildCompanyDriverJobPosting()
const ownerJobPosting = buildOwnerOperatorJobPosting()

const faqItems = [
  {
    question: "How long does the application take?",
    answer:
      "The form is four short screens. Phone first, so dispatch can call even if you close the tab.",
  },
  {
    question: "What seats are open?",
    answer: `Company drivers at ${PAY_RATES.companyDriver.local.perMile}/mile — local, regional, or OTR. Owner-operators keep ${PAY_RATES.ownerOperator.commission} of gross.`,
  },
  {
    question: "How will I hear back?",
    answer: "Dispatch calls or emails the number and address you put on the form.",
  },
]

export default function ApplyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(companyJobPosting) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ownerJobPosting) }}
      />

      <div className="brand-page-shell min-h-screen overflow-x-hidden bg-navy-950">
        <PageBreadcrumb pageName="Apply Now" category="Drivers" />

        <section className="border-b border-white/5 bg-navy-950 py-10 md:py-16">
          <div className="container">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
              {COMPANY_INFO.location} · USDOT {COMPANY_INFO.dot}
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">
              Apply. {PAY_RATES.companyDriver.local.perMile}/mile company,{" "}
              {PAY_RATES.ownerOperator.commission} owner-op.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">
              The form is about a minute. Or call{" "}
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                {COMPANY_INFO.phone}
              </a>
              .
            </p>

            <div className="mt-10 grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="order-1 lg:col-span-7 lg:order-2" id="application-form">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" data-light>
                  <div className="border-b border-white/10 bg-navy px-6 py-4">
                    <h2 className="text-lg font-bold text-white">Start Your Application</h2>
                    <p className="text-xs text-slate-300">
                      Phone first. We call you back from that number.
                    </p>
                  </div>
                  <div className="p-4 md:p-8">
                    <ApplicationForm />
                  </div>
                </div>
              </div>

              <aside className="order-2 space-y-6 lg:col-span-5 lg:order-1 lg:sticky lg:top-24">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-orange-500/30 bg-steel-900/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
                      Owner Operators
                    </p>
                    <p className="text-3xl font-black text-orange-400">
                      {PAY_RATES.ownerOperator.commission}
                    </p>
                    <p className="text-sm text-slate-300">gross split</p>
                  </div>
                  <div className="rounded-xl border border-orange-500/30 bg-steel-900/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
                      Company Drivers
                    </p>
                    <p className="text-3xl font-black text-orange-400">
                      {PAY_RATES.companyDriver.otr.perMile}
                    </p>
                    <p className="text-sm text-slate-300">per mile, every lane</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-navy-700 p-6">
                  <h2 className="mb-4 text-lg font-bold text-white">Open positions — pay and benefits</h2>
                  <p className="mb-4 text-xs leading-relaxed text-slate-400">
                    Posted under Washington&apos;s Equal Pay and Opportunities Act. Every figure comes from the same pay plan as /pay-rates.
                  </p>
                  <div className="space-y-4 text-sm text-slate-300">
                    <div>
                      <p className="font-semibold text-white">
                        Company driver — {PAY_RATES.companyDriver.local.perMile}/mile
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        <li>
                          Local ({PAY_RATES.companyDriver.local.homeTime.toLowerCase()}):{" "}
                          {PAY_RATES.companyDriver.local.annual}/year
                        </li>
                        <li>
                          Regional ({PAY_RATES.companyDriver.regional.homeTime.toLowerCase()}):{" "}
                          {PAY_RATES.companyDriver.regional.annual}/year
                        </li>
                        <li>
                          OTR ({PAY_RATES.companyDriver.otr.homeTime} out):{" "}
                          {PAY_RATES.companyDriver.otr.annual}/year
                        </li>
                      </ul>
                      <p className="mt-2 text-xs text-slate-400">{BENEFITS.companyDriver.join(" · ")}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        Owner-operator — {PAY_RATES.ownerOperator.commission} of gross
                      </p>
                      <p className="mt-1">
                        Typical {PAY_RATES.ownerOperator.annualGross}/year at {PAY_RATES.ownerOperator.perMile}
                        /mile. Fuel surcharge {PAY_RATES.ownerOperator.fuelSurcharge} pass-through. Sign-on{" "}
                        {PAY_RATES.ownerOperator.signOnBonus}.
                      </p>
                      <p className="mt-2 text-xs text-slate-400">{BENEFITS.ownerOperator.join(" · ")}</p>
                    </div>
                    <p className="text-xs text-slate-400">{WORKPLACE.languages}</p>
                    <p className="text-xs text-slate-400">{WORKPLACE.elp}</p>
                    <p className="text-xs text-slate-500">{WORKPLACE.eeo}</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 bg-navy-700 py-12 lg:py-16">
          <div className="container max-w-3xl">
            <h2 className="mb-6 text-2xl font-bold text-white">Questions before you submit</h2>
            <FAQAccordion items={faqItems} darkBackground={true} />
          </div>
        </section>
      </div>
    </>
  )
}
