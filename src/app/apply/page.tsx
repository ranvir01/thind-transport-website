import { Metadata } from "next"
import Link from "next/link"
import { ApplicationForm } from "@/components/application/ApplicationForm"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { FAQAccordion } from "@/components/shared/FAQAccordion"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Headphones,
  Phone,
  Route,
  Shield,
  Truck,
} from "lucide-react"

export const metadata: Metadata = {
  title: `Apply Now | ${COMPANY_INFO.name}`,
  description: `Apply for CDL Class A opportunities with ${COMPANY_INFO.name}. Learn about owner-operator and company driver options, experience requirements, and next steps with our Kent, WA team.`,
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
  baseSalary: {
    "@type": "MonetaryAmount",
    currency: "USD",
    value: {
      "@type": "QuantitativeValue",
      minValue: 65000,
      maxValue: 250000,
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

export default function ApplyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }}
      />

      <div className="brand-page-shell min-h-screen overflow-x-hidden bg-[#060607]">
        <PageBreadcrumb pageName="Apply Now" category="Drivers" />

        <section className="border-b border-white/5 bg-[#060607] py-10 md:py-20">
          <div className="container">
            <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
                <div className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-600/10 px-4 py-2 text-sm font-bold text-orange-300">
                  CDL Class A Opportunities
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl font-black leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
                    Start the Conversation.
                    <span className="block text-orange-500">We&apos;ll Take It From There.</span>
                  </h1>
                  <p className="text-lg leading-relaxed text-slate-300">
                    Submit the short form and our team will review your experience, route preferences, and whether a company driver or owner-operator opening is the better fit.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-orange-500/30 bg-[#17181B]/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
                      Owner Operators
                    </p>
                    <p className="text-3xl font-black text-orange-400">{PAY_RATES.ownerOperator.commission}</p>
                    <p className="text-sm text-slate-300">gross split</p>
                  </div>
                  <div className="rounded-xl border border-orange-500/30 bg-[#17181B]/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
                      Company Drivers
                    </p>
                    <p className="text-3xl font-black text-orange-400">{PAY_RATES.companyDriver.otr.perMile}</p>
                    <p className="text-sm text-slate-300">OTR pay range</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    "Flatbed, reefer, and dry van opportunities",
                    "Local, regional, and OTR conversations",
                    "Weekly settlements and direct support",
                    "Based in Kent, WA",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0B0C0E] p-6">
                  <h2 className="mb-4 text-lg font-bold text-white">Before You Apply</h2>
                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                      <span>Valid CDL Class A license</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                      <span>Recent verifiable driving experience</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                      <span>Clean MVR and ability to meet DOT requirements</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 w-full" id="application-form">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" data-light>
                  <div className="border-b border-white/10 bg-[#131418] px-6 py-4">
                    <h2 className="text-lg font-bold text-white">Start Your Application</h2>
                    <p className="text-xs text-slate-300">
                      Share your contact information and driving background. We&apos;ll follow up from there.
                    </p>
                  </div>
                  <div className="p-4 md:p-8">
                    <ApplicationForm />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 bg-[#0B0C0E] py-12 lg:py-16">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
              <div className="space-y-8 lg:col-span-2">
                <div className="rounded-2xl border border-white/5 bg-[#060607] p-6 md:p-8">
                  <h2 className="mb-6 text-2xl font-bold text-white">What To Expect</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-orange-400">The Work</h3>
                      <div className="space-y-3 text-sm text-slate-300">
                        <div className="flex items-start gap-3">
                          <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                          <span>Flatbed, reefer, and dry van freight</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Route className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                          <span>Local, regional, and OTR discussions based on fit</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Headphones className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                          <span>Direct communication with dispatch and recruiting</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-orange-400">The Process</h3>
                      <div className="space-y-3 text-sm text-slate-300">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                          <span>Submit the form with your basic information</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                          <span>Our team reviews experience and current openings</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                          <span>We follow up by phone or email if the fit looks strong</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#0B0C0E] p-6 md:p-8">
                  <h2 className="mb-6 text-2xl font-bold text-white">Frequently Asked Questions</h2>
                  <FAQAccordion items={faqItems} darkBackground={true} gradientColor="#0B0C0E" />
                </div>
              </div>

              <div className="space-y-6 lg:sticky lg:top-24">
                <div className="rounded-2xl border border-white/5 bg-[#060607] p-6">
                  <h3 className="mb-4 text-lg font-bold text-white">Application Notes</h3>
                  <div className="space-y-4">
                    {[
                      {
                        icon: Shield,
                        title: "Secure Form",
                        desc: "Your information is only used for recruiting follow-up.",
                      },
                      {
                        icon: CheckCircle2,
                        title: "No Pressure",
                        desc: "Submitting the form starts a conversation. It does not lock you into anything.",
                      },
                      {
                        icon: Headphones,
                        title: "Direct Contact",
                        desc: "You will hear from a real team member, not an automated workflow.",
                      },
                    ].map((item) => (
                      <div key={item.title} className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                          <item.icon className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="text-xs text-slate-400">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 p-6 text-center shadow-lg shadow-orange-900/30">
                  <Phone className="mx-auto mb-3 h-8 w-8 text-white" />
                  <p className="mb-2 text-sm text-white/90">Questions before you apply?</p>
                  <Link
                    href={`tel:${COMPANY_INFO.phoneFormatted}`}
                    className="block text-2xl font-black text-white transition-colors hover:text-orange-200"
                  >
                    {COMPANY_INFO.phone}
                  </Link>
                  <p className="mt-2 text-xs text-orange-100">Call or submit the form and we&apos;ll follow up.</p>
                </div>

                <Link
                  href="/pre-qualify"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[#17181B] px-6 py-4 font-bold text-white transition-all hover:bg-[#212226]"
                >
                  Not Ready Yet? Pre-Qualify
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
