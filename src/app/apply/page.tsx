import { Metadata } from "next"
import Link from "next/link"
import { ApplicationForm } from "@/components/application/ApplicationForm"
import { COMPANY_INFO, PAY_RATES, SERVICES } from "@/lib/constants"
import { parseAnnualRange } from "@/lib/job-posting"
import { FAQAccordion } from "@/components/shared/FAQAccordion"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { Reveal } from "@/components/ui/Reveal"
import { BadgeCheck, CheckCircle2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Apply now",
  description: `Apply for CDL Class A opportunities with ${COMPANY_INFO.name}. Learn about owner-operator and company driver options, experience requirements, and next steps with our ${COMPANY_INFO.location} team.`,
  alternates: {
    canonical: "https://thindtransport.com/apply",
  },
}

const jobPostingSchema = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "CDL Class A Driver Opportunities",
  description:
    "Thind Transport is hiring experienced CDL Class A company drivers and owner operators.",
  identifier: {
    "@type": "PropertyValue",
    name: COMPANY_INFO.name,
    value: "driver-opportunities",
  },
  datePosted: new Date().toISOString().split("T")[0],
  validThrough: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  employmentType: ["FULL_TIME", "CONTRACTOR"],
  hiringOrganization: {
    "@type": "Organization",
    name: COMPANY_INFO.name,
    sameAs: "https://thindtransport.com",
    logo: "https://thindtransport.com/branding/thind-transport-logo.svg",
  },
  jobLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kent",
      addressRegion: "WA",
      addressCountry: "US",
    },
  },
  applicantLocationRequirements: {
    "@type": "Country",
    name: "United States",
  },
  // Company-driver pay only: owner-operator gross is revenue, not salary, and
  // putting it here told Google the job pays up to $250K.
  baseSalary: {
    "@type": "MonetaryAmount",
    currency: "USD",
    value: {
      "@type": "QuantitativeValue",
      minValue: parseAnnualRange(PAY_RATES.companyDriver.local.annual)[0],
      maxValue: parseAnnualRange(PAY_RATES.companyDriver.otr.annual)[1],
      unitText: "YEAR",
    },
  },
  qualifications:
    "Valid CDL Class A license, recent verifiable driving experience, and a clean safety record.",
  directApply: true,
}

const faqItems = [
  {
    question: "How long does the application take?",
    answer:
      "The initial form is short. Once we review it, our team follows up to confirm experience, equipment, trailer type, and preferred lanes.",
  },
  {
    question: "What opportunities are available?",
    answer:
      "We speak with both company drivers and owner operators. Availability depends on experience, route preferences, and current equipment needs.",
  },
  {
    question: "What kind of freight do you handle?",
    answer:
      "Our site focuses on flatbed, reefer, and dry van opportunities with a mix of local, regional, and over-the-road work.",
  },
  {
    question: "How will I hear back?",
    answer:
      `If your background lines up with current openings, a team member will reach out by phone or email using the contact information you provide.`,
  },
]

/** What we can say about the work without inventing anything. */
const workFacts = [
  `${SERVICES.types.join(", ")} opportunities`,
  "Local, regional, and OTR conversations",
  "Weekly settlements and direct support",
  `Based in ${COMPANY_INFO.location}`,
]

const beforeYouApply = [
  "Valid CDL Class A license",
  "Recent verifiable driving experience",
  "Clean MVR and ability to meet DOT requirements",
]

export default function ApplyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }}
      />

      <div className="min-h-screen overflow-x-hidden bg-navy-950">
        {/* omitApply alone already makes Call the band's filled action —
            AsphaltHero's `callIsPrimary` is `primary === "call" || omitApply`,
            so the band never ships without a red. `primary="call"` stays
            explicit so the next reader does not "fix" it into a text link and
            get the identical rendering. The second red this used to share the
            phone viewport with — the wizard's pinned command bar — now waits
            until the form is in view (ApplicationForm.tsx). */}
        <AsphaltHero
          breadcrumb={
            /* The trail now lives INSIDE the asphalt band, so its own bar
               chrome — opaque ground, blur, nav-clearance padding, centred
               row and a second container gutter — is overridden here rather
               than duplicated as a bar above the hero. */
            <PageBreadcrumb
              pageName="Apply Now"
              category="Drivers"
              className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
            />
          }
          eyebrow="Apply"
          title="Start the conversation. We'll take it from there."
          description="Submit the short form and our team reviews your experience, route preferences, and whether a company driver or owner-operator seat is the better fit."
          primary="call"
          omitApply
          extraLinks={[{ href: "#application", label: "Skip to the form" }]}
        >
          {/* Stacked on a phone: the eyebrows are display caps at wide
              tracking, and two of them side by side at phone width is where
              this band would first overflow. */}
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-m-3 border border-white/10 bg-white/5 p-5">
              <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                Owner operators
              </dt>
              <dd className="mt-2 font-mono text-m-h3 font-bold tabular-nums text-paper">
                {PAY_RATES.ownerOperator.commission}
              </dd>
              <dd className="mt-1 text-m-body text-paper/70">of gross revenue</dd>
            </div>
            <div className="rounded-m-3 border border-white/10 bg-white/5 p-5">
              <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                Company drivers
              </dt>
              <dd className="mt-2 font-mono text-m-h3 font-bold tabular-nums text-paper">
                {PAY_RATES.companyDriver.otr.perMile}
              </dd>
              <dd className="mt-1 text-m-body text-paper/70">
                {`per mile, home ${PAY_RATES.companyDriver.local.homeTime.toLowerCase()}, ${PAY_RATES.companyDriver.regional.homeTime.toLowerCase()}, or OTR`}
              </dd>
            </div>
          </dl>
        </AsphaltHero>

        <section
          id="application"
          aria-labelledby="application-heading"
          className="scroll-mt-24 bg-navy-950 py-section"
        >
          <div className="container">
            <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
              {/* "Before you apply" and the work facts are DARK ROWS, one
                  grammar for both — the form beside them is the page's single
                  paper island, and two paper islands never touch. */}
              <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-24">
                <Reveal>
                  <div className="rounded-m-3 border border-white/10 bg-white/5 p-6">
                    <h2 className="font-display text-m-h4 font-bold text-white">Before you apply</h2>
                    <ul className="mt-4 list-none space-y-3">
                      {beforeYouApply.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-m-body text-steel-200">
                          <BadgeCheck className="mt-1 h-4 w-4 flex-shrink-0 text-signal-up" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>

                <Reveal index={1}>
                  <div className="rounded-m-3 border border-white/10 bg-white/5 p-6">
                    <h2 className="font-display text-m-h4 font-bold text-white">What the work looks like</h2>
                    <ul className="mt-4 list-none space-y-3">
                      {workFacts.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-m-body text-steel-200">
                          <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-signal-up" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </div>

              <div className="w-full lg:col-span-7" id="application-form">
                <div className="rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8">
                  {/* "Start Your Application" is pinned verbatim by
                      scripts/e2e-funnel-smoke.mjs and e2e-anchors.test.ts. */}
                  <h2 id="application-heading" className="font-display text-m-h3 font-bold text-ink">
                    Start Your Application
                  </h2>
                  <p className="mt-2 max-w-measure text-m-body text-ink-2">
                    Share your contact information and driving background. We&apos;ll follow up from there.
                  </p>
                  <div className="mt-8">
                    <ApplicationForm />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="apply-faq-heading" className="bg-asphalt py-section">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <h2 id="apply-faq-heading" className="font-display text-m-h2 font-bold text-paper text-balance">
                Questions before you apply
              </h2>
              <div className="mt-8">
                <FAQAccordion items={faqItems} darkBackground />
              </div>
            </div>
          </div>
        </section>

        {/* The page's ONE closing call block — the gradient phone card and the
            duplicate "Application notes" rail it replaced were a second and
            third CTA on a page whose CTA is the form above. */}
        <section aria-labelledby="apply-call-heading" className="bg-navy-950 py-section-tight">
          <div className="container">
            <div className="mx-auto max-w-measure text-center">
              <h2 id="apply-call-heading" className="font-display text-m-h3 font-bold text-white text-balance">
                Rather talk it through first?
              </h2>
              <p className="mt-3 text-m-body text-steel-300">
                Call the office and ask whatever you want before you fill anything in.
              </p>
              <p className="mt-5">
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
                  href="/pre-qualify"
                  className="inline-flex min-h-[48px] items-center text-m-body font-semibold text-steel-200 underline-offset-4 hover:text-white hover:underline"
                >
                  Not ready yet? Start with the pre-qualification
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
