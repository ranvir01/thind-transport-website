import { COMPANY_INFO, SERVICES, STATS } from "@/lib/constants"

const SITE_URL = "https://thindtransport.com"

/**
 * Site-wide structured data: Organization (as a local freight carrier) + WebSite.
 * Page-specific schemas (JobPosting, FAQPage, Service) live on their own pages
 * so crawlers never see duplicate or off-topic entities.
 */
export function SchemaMarkup() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: COMPANY_INFO.name,
    legalName: `${COMPANY_INFO.name} LLC`,
    url: SITE_URL,
    logo: `${SITE_URL}/branding/thind-transport-logo.svg`,
    image: `${SITE_URL}/og-image.png`,
    description:
      "Family-run trucking company based in Kent, Washington. Flatbed, reefer, and dry van freight across the lower 48 — hiring CDL-A company drivers and owner-operators.",
    slogan: "You drive. We handle the rest.",
    founder: {
      "@type": "Person",
      name: COMPANY_INFO.owner,
    },
    foundingDate: String(COMPANY_INFO.founded),
    numberOfEmployees: {
      "@type": "QuantitativeValue",
      minValue: STATS.activeDrivers,
    },
    naics: "484121",
    identifier: [
      {
        "@type": "PropertyValue",
        propertyID: "USDOT",
        value: COMPANY_INFO.dot,
      },
      {
        "@type": "PropertyValue",
        propertyID: "MC",
        value: COMPANY_INFO.mc,
      },
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY_INFO.address.split(",")[0],
      addressLocality: "Kent",
      addressRegion: "WA",
      postalCode: "98064",
      addressCountry: "US",
    },
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
    knowsAbout: [...SERVICES.types, "Freight transportation", "CDL Class A driving jobs", "Owner operator programs"],
    telephone: COMPANY_INFO.phoneFormatted,
    email: COMPANY_INFO.email,
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: COMPANY_INFO.phoneFormatted,
        contactType: "recruiting",
        areaServed: "US",
        availableLanguage: ["English", "Punjabi", "Hindi"],
      },
    ],
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: COMPANY_INFO.name,
    url: SITE_URL,
    inLanguage: "en-US",
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
  }

  return (
    <>
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
