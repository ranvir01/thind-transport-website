import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"

export function SchemaMarkup() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://thindtransport.com/#organization",
    name: COMPANY_INFO.name,
    url: "https://thindtransport.com",
    logo: "https://thindtransport.com/branding/thind-transport-logo.svg",
    description:
      "Family-run trucking company based in Kent, Washington serving flatbed, reefer, and dry van freight.",
    founder: {
      "@type": "Person",
      name: COMPANY_INFO.owner,
    },
    foundingDate: String(COMPANY_INFO.founded),
    address: {
      "@type": "PostalAddress",
      streetAddress: "PO Box 5114",
      addressLocality: "Kent",
      addressRegion: "WA",
      postalCode: "98064",
      addressCountry: "US",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: COMPANY_INFO.phoneFormatted,
        contactType: "recruiting",
        areaServed: "US",
        availableLanguage: ["English"],
      },
      {
        "@type": "ContactPoint",
        email: COMPANY_INFO.email,
        contactType: "customer support",
      },
    ],
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://thindtransport.com/#website",
    name: COMPANY_INFO.name,
    url: "https://thindtransport.com",
    publisher: {
      "@id": "https://thindtransport.com/#organization",
    },
  }

  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "CDL Class A Driver Opportunities",
    description: `${COMPANY_INFO.name} is hiring experienced CDL Class A company drivers and owner operators. Weekly settlements, direct support, and flatbed, reefer, and dry van opportunities are available.`,
    identifier: {
      "@type": "PropertyValue",
      name: COMPANY_INFO.name,
      value: "driver-opportunities",
    },
    datePosted: new Date().toISOString().split("T")[0],
    validThrough: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      .toISOString()
      .split("T")[0],
    employmentType: ["FULL_TIME", "CONTRACTOR"],
    hiringOrganization: {
      "@id": "https://thindtransport.com/#organization",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Kent",
        addressRegion: "WA",
        postalCode: "98064",
        addressCountry: "US",
      },
    },
    applicantLocationRequirements: {
      "@type": "Country",
      name: "US",
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
    jobBenefits: [
      "Weekly settlements",
      "Direct dispatch support",
      "Flatbed, reefer, and dry van opportunities",
      `${PAY_RATES.ownerOperator.commission} owner operator split`,
    ],
    qualifications:
      "Valid CDL Class A license with recent verifiable driving experience and a clean safety record.",
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  )
}

