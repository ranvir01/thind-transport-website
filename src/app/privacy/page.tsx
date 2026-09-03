import type { Metadata } from "next"
import { COMPANY_INFO } from "@/lib/constants"
import { AsphaltHero } from "@/components/shared/AsphaltHero"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    `How ${COMPANY_INFO.name} collects, uses, and protects the information you share with us when applying for a driving position or contacting our team.`,
  alternates: { canonical: "/privacy" },
}

const sections = [
  {
    id: "analytics",
    heading: "Analytics",
    body: [
      "This site uses Vercel Web Analytics and Speed Insights — cookieless, anonymous page and performance measurement. No advertising trackers, no cross-site tracking, and no personal information in any analytics event: form events record only which step was reached, never what was typed. If you pick an audience (drivers, shippers, brokers) we remember the choice in a small cookie so the site can lead with the right door next time; it identifies a preference, not a person.",
    ],
    items: [],
  },
  {
    id: "collect",
    heading: "Information we collect",
    body: [
      "When you submit an application, pre-qualification form, or contact request on this site, we collect the information you provide: your name, phone number, email address, CDL class, years of driving experience, and any details you include about your equipment or work history.",
    ],
    items: [
      "Contact details — name, phone number, email address",
      "Driver qualifications — CDL class, endorsements, years of experience",
      "Application details — position interest, equipment ownership, work history",
      "Technical basics — IP address and browser type, used only for security and spam prevention",
    ],
  },
  {
    id: "use",
    heading: "How we use your information",
    body: [
      "We use the information you share for one purpose: evaluating and processing your interest in driving for Thind Transport. That includes contacting you about your application, verifying your qualifications as required by FMCSA regulations (49 CFR Part 391), and preparing the DOT employment application if you move forward.",
      "We do not sell, rent, or trade your personal information. We do not use your information for third-party advertising.",
    ],
  },
  {
    id: "access",
    heading: "Who can see your information",
    body: [
      "Your application is reviewed by our recruiting and operations team only. Limited service providers help us run this website — our hosting provider and our email provider — and they process data solely on our behalf. If you are hired, information required by federal regulation is retained in your driver qualification file.",
    ],
  },
  {
    id: "retention",
    heading: "Data retention",
    body: [
      "Application records are kept for as long as needed to evaluate your application and to satisfy federal record-keeping requirements. If you'd like your information removed earlier, contact us and we'll delete it unless we're legally required to keep it.",
    ],
  },
  {
    id: "choices",
    heading: "Your choices",
    body: [
      "You can request a copy of the information we hold about you, ask us to correct it, or ask us to delete it at any time. Reach us by phone or email below and we'll respond promptly.",
    ],
  },
]

/**
 * Legal page on the site's dark ground: no paper island, because long-form
 * legal prose is reading, not data. One measure (68ch), steel-200 body, the
 * section rhythm, and the phone number in mono tabular figures like every
 * other number on the site.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        eyebrow="Legal"
        title="Privacy policy"
        description={`We collect your information for one reason — to talk with you about driving for ${COMPANY_INFO.name}. Nothing is sold, nothing is shared with advertisers, and you can ask us to delete it at any time.`}
        primary="call"
        omitApply
        extraLinks={[{ href: "/", label: "Back to home" }]}
      />

      <div className="bg-navy-950 py-section">
        <div className="container">
          <p className="mx-auto max-w-measure text-m-body text-steel-300">
            {`${COMPANY_INFO.name} · ${COMPANY_INFO.address} · Effective June 2026`}
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
              the requests above. */}
          <section
            aria-labelledby="privacy-contact-heading"
            className="mx-auto mt-12 max-w-measure rounded-m-3 border border-white/10 bg-white/5 p-6"
          >
            <h2
              id="privacy-contact-heading"
              className="font-display text-m-h3 font-bold text-white text-balance"
            >
              Questions or requests
            </h2>
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
        </div>
      </div>
    </div>
  )
}
