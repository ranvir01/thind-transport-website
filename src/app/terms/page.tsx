import type { Metadata } from "next"
import Link from "next/link"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { AsphaltHero } from "@/components/shared/AsphaltHero"

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    `The plain-English rules for using the ${COMPANY_INFO.name} website, its tools, and the driver portal.`,
  alternates: { canonical: "/terms" },
}

const LAST_UPDATED = "September 14, 2026"

const sections = [
  {
    id: "acceptance",
    heading: "Acceptance of these terms",
    body: [
      `By using this website you agree to these terms. If you don't agree, please don't use the site. They apply to every page on thindtransport.com, the forms and tools on it, and the driver portal, and they sit alongside our privacy policy.`,
    ],
    items: [],
  },
  {
    id: "informational",
    heading: "The site is informational",
    body: [
      `Pay figures, bonuses, and benefits on this site — for example ${PAY_RATES.ownerOperator.commission} of gross for owner operators and ${PAY_RATES.companyDriver.local.perMile} per mile for company drivers — reflect the rates we currently publish and can change without notice. Annual ranges such as ${PAY_RATES.ownerOperator.annualGross} for owner operators depend on the loads you run, the lanes you choose, and how much you drive.`,
      `Nothing on this site is an offer of employment, a contract, or a guarantee of loads, miles, or income.`,
    ],
  },
  {
    id: "applications",
    heading: "Applications",
    body: [
      `Every application is reviewed individually. Driving positions are subject to FMCSA and DOT requirements, including the driver qualification rules in 49 CFR Part 391, a motor vehicle record check, and drug and alcohol testing. Submitting a form on this site starts a conversation; it does not create a job offer.`,
    ],
  },
  {
    id: "submissions",
    heading: "Information you submit",
    body: [
      `Anything you send us through a form must be accurate and yours to share. By submitting a form you agree that we may contact you by phone, text message, or email about your inquiry. You can opt out at any time by replying STOP to a text or by telling us — message and data rates from your carrier may apply.`,
    ],
  },
  {
    id: "tools",
    heading: "Tools and estimates",
    body: [
      `The freight class calculator, the quote form, and the other calculators on this site give estimates from the details you enter. They are not binding quotes, invoices, or classifications. A rate is only final once a person at ${COMPANY_INFO.name} confirms it with you.`,
    ],
  },
  {
    id: "portal",
    heading: "Driver portal accounts",
    body: [
      `An account on the driver portal is for the driver it was issued to. Keep your login private, don't share your account, and tell us right away if you think someone else has used it. We may suspend or close an account that is misused.`,
    ],
  },
  {
    id: "ip",
    heading: "Intellectual property",
    body: [
      `The content on this site — text, photos, video, the ${COMPANY_INFO.name} name and logo, and the tools we built — belongs to ${COMPANY_INFO.name}. You may read it and share links to it. Don't copy, republish, or use it commercially without our written permission.`,
    ],
  },
  {
    id: "liability",
    heading: "No warranties and limitation of liability",
    body: [
      `We keep this site as accurate and available as we can, but we provide it "as is." We don't promise it will always be error-free, up to date, or online. To the fullest extent the law allows, ${COMPANY_INFO.name} is not liable for losses that come from relying on the site, its estimates, or its tools, or from being unable to use it.`,
    ],
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    body: [
      `We may update these terms from time to time. When we do, the "Last updated" date at the top of this page changes. Using the site after an update means you accept the new terms.`,
    ],
  },
  {
    id: "law",
    heading: "Governing law",
    body: [
      `These terms are governed by the laws of the State of Washington, without regard to its conflict-of-law rules. Any dispute about the site is handled in the state or federal courts serving King County, Washington.`,
    ],
  },
]

/**
 * Legal page on the site's dark ground, built exactly like /privacy: one
 * measure (68ch), steel-200 body, the section rhythm, and the phone number in
 * mono tabular figures like every other number on the site.
 */
export default function TermsPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        eyebrow="Legal"
        title="Terms of service"
        description={`The plain-English rules for using this site, its tools, and the driver portal. Short version: the site is informational, our forms start a conversation, and pay figures reflect what we publish today.`}
        primary="call"
        omitApply
        extraLinks={[
          { href: "/privacy", label: "Privacy policy" },
          { href: "/", label: "Back to home" },
        ]}
      />

      <div className="bg-navy-950 py-section">
        <div className="container">
          <p className="mx-auto max-w-measure text-m-body text-steel-300">
            {`${COMPANY_INFO.name} · ${COMPANY_INFO.address} · Last updated ${LAST_UPDATED}`}
          </p>

          {sections.map((section) => (
            <section
              key={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="mx-auto mt-12 max-w-measure"
            >
              <h2
                id={`${section.id}-heading`}
                className="font-display text-m-h3 font-bold text-white text-balance"
              >
                {section.heading}
              </h2>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mt-4 text-m-body text-steel-200">
                  {paragraph}
                </p>
              ))}
              {section.items && section.items.length > 0 ? (
                <ul className="mt-4 list-disc space-y-2 pl-6 text-m-body text-steel-200 marker:text-orange-300">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {/* The page's one closing block: how to reach a person about any of
              the terms above. */}
          <section
            aria-labelledby="terms-contact-heading"
            className="mx-auto mt-12 max-w-measure rounded-m-3 border border-white/10 bg-white/5 p-6"
          >
            <h2
              id="terms-contact-heading"
              className="font-display text-m-h3 font-bold text-white text-balance"
            >
              Contact
            </h2>
            <p className="mt-4 text-m-body text-steel-200">{COMPANY_INFO.name}</p>
            <p className="text-m-body text-steel-200">{COMPANY_INFO.address}</p>
            <p className="mt-4 text-m-body text-steel-200">
              <span>Phone: </span>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="inline-flex min-h-[44px] items-center font-semibold text-white underline-offset-4 hover:text-signal-up hover:underline"
              >
                <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
              </a>
            </p>
            <p className="text-m-body text-steel-200">
              <span>Email: </span>
              <a
                href={`mailto:${COMPANY_INFO.email}`}
                className="inline-flex min-h-[44px] items-center break-all font-semibold text-white underline-offset-4 hover:text-signal-up hover:underline"
              >
                {COMPANY_INFO.email}
              </a>
            </p>
          </section>

          <p className="mx-auto mt-8 max-w-measure text-m-body text-steel-300">
            <span>How we handle the information you share is covered in our </span>
            <Link
              href="/privacy"
              className="font-semibold text-white underline-offset-4 hover:text-signal-up hover:underline"
            >
              privacy policy
            </Link>
            <span>.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
