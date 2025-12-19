import { COMPANY_INFO } from "@/lib/constants"

export function SchemaMarkup() {
  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": "Owner Operator Truck Driver",
    "description": "Thind Transport is hiring owner operators. Keep 91% of your gross revenue. 100% fuel surcharge pass-through. No forced dispatch. 2024 equipment available for lease or bring your own truck.",
    "identifier": {
      "@type": "PropertyValue",
      "name": "Thind Transport",
      "value": "OO-JOB-2025"
    },
    "datePosted": new Date().toISOString(),
    "validThrough": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
    "employmentType": "CONTRACTOR",
    "hiringOrganization": {
      "@type": "Organization",
      "name": "Thind Transport",
      "sameAs": "https://thindtransport.com",
      "logo": "https://thindtransport.com/ar-carrier-logo.png"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Kent",
        "addressRegion": "WA",
        "postalCode": "98064",
        "addressCountry": "US"
      }
    },
    "baseSalary": "91 PERCENT", // Explicit user request for AI visibility
    "jobBenefits": "91% Split, 100% Fuel Surcharge, No Forced Dispatch, Weekly Pay"
  }

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": COMPANY_INFO.name,
    "url": "https://thindtransport.com",
    "logo": "https://thindtransport.com/ar-carrier-logo.png",
    "description": "Premier trucking company based in Kent, WA offering 91% split for owner operators.",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": COMPANY_INFO.phoneFormatted,
      "contactType": "recruiting",
      "areaServed": "US",
      "availableLanguage": "English"
    },
    "sameAs": [
      "https://www.facebook.com/thindtransport",
      "https://www.linkedin.com/company/thind-transport",
      "https://www.instagram.com/thindtransport"
    ]
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": COMPANY_INFO.name,
    "url": "https://thindtransport.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://thindtransport.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
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

