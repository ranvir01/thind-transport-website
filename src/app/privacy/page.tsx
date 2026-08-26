import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Thind Transport collects, uses, and protects the information you share with us when applying for a driving position or contacting our team.",
  alternates: { canonical: "/privacy" },
}

const sections = [
  {
    heading: "Analytics",
    body: [
      "This site uses Vercel Web Analytics and Speed Insights — cookieless, anonymous page and performance measurement. No advertising trackers, no cross-site tracking, and no personal information in any analytics event: form events record only which step was reached, never what was typed. If you pick an audience (drivers, shippers, brokers) we remember the choice in a small cookie so the site can lead with the right door next time; it identifies a preference, not a person.",
    ],
    items: [],
  },
  {
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
    heading: "How we use your information",
    body: [
      "We use the information you share for one purpose: evaluating and processing your interest in driving for Thind Transport. That includes contacting you about your application, verifying your qualifications as required by FMCSA regulations (49 CFR Part 391), and preparing the DOT employment application if you move forward.",
      "We do not sell, rent, or trade your personal information. We do not use your information for third-party advertising.",
    ],
  },
  {
    heading: "Who can see your information",
    body: [
      "Your application is reviewed by our recruiting and operations team only. Limited service providers help us run this website — our hosting provider and our email provider — and they process data solely on our behalf. If you are hired, information required by federal regulation is retained in your driver qualification file.",
    ],
  },
  {
    heading: "Data retention",
    body: [
      "Application records are kept for as long as needed to evaluate your application and to satisfy federal record-keeping requirements. If you'd like your information removed earlier, contact us and we'll delete it unless we're legally required to keep it.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can request a copy of the information we hold about you, ask us to correct it, or ask us to delete it at any time. Reach us by phone or email below and we'll respond promptly.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="bg-white min-h-screen pt-24 pb-12" data-light>
      <div className="container mx-auto px-4 max-w-3xl">
        <Link href="/" className="inline-flex items-center text-gray-500 hover:text-orange mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-black text-navy mb-4 leading-tight">
          Privacy <span className="text-orange">Policy</span>
        </h1>
        <p className="text-gray-500 mb-10">
          {COMPANY_INFO.name} · {COMPANY_INFO.address} · Effective June 2026
        </p>

        <div className="prose prose-lg max-w-none text-gray-700">
          <p className="text-xl leading-relaxed mb-10 font-medium text-navy/80">
            We collect your information for one reason — to talk with you about driving for {COMPANY_INFO.name}.
            Nothing is sold, nothing is shared with advertisers, and you can ask us to delete it at any time.
          </p>

          {sections.map((section) => (
            <section key={section.heading} className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mb-4 text-gray-700">
                  {paragraph}
                </p>
              ))}
              {section.items && section.items.length > 0 && (
                <ul className="list-disc pl-6 space-y-2 text-gray-700 marker:text-orange-600">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="mb-12 bg-gray-50 p-8 rounded-2xl border border-gray-100">
            <h2 className="text-2xl font-bold text-navy mb-4 mt-0">Questions or requests</h2>
            <p className="mb-2 text-gray-700">
              Phone:{" "}
              <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="font-semibold text-orange-700 hover:underline">
                {COMPANY_INFO.phone}
              </a>
            </p>
            <p className="mb-0 text-gray-700">
              Email:{" "}
              <a href={`mailto:${COMPANY_INFO.email}`} className="font-semibold text-orange-700 hover:underline">
                {COMPANY_INFO.email}
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
