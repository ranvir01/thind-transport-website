import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { CinematicNavbar } from "@/components/cinematic/Navbar"
import { ActiveBackground } from "@/components/ui/ActiveBackground"
import { SmoothScroll } from "@/components/cinematic/SmoothScroll"
import { CinematicFooter, CommandBar, MobileCommandBar } from "@/components/cinematic/Footer"
import { LeadMagnetModal } from "@/components/shared/LeadMagnetModal"
import { QuickContactWidget } from "@/components/shared/QuickContactWidget"
import { ExitIntentPopup } from "@/components/shared/ExitIntentPopup"
import { StickyMobileCTA } from "@/components/shared/StickyMobileCTA"
import { RecentlyHiredTicker } from "@/components/shared/RecentlyHiredTicker"
import { BackToTop } from "@/components/shared/BackToTop"
import { Toaster } from "@/components/ui/sonner"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap", 
  variable: "--font-space",
})

// SEO-Optimized Metadata
export const metadata: Metadata = {
  metadataBase: new URL("https://thindtransport.com"),
  title: {
    default: `Owner Operator Jobs 91% Split | ${COMPANY_INFO.name} | Hiring CDL Drivers`,
    template: `%s | ${COMPANY_INFO.name}`
  },
  description: `Keep 91% of your gross with ${COMPANY_INFO.name}. Family-owned trucking company hiring CDL Class A drivers & owner operators. 2024 Cascadias, no forced dispatch, weekly pay. Based in Kent, WA. Apply now: ${COMPANY_INFO.phone}`,
  keywords: [
    // High-intent keywords
    "owner operator jobs 91 percent",
    "owner operator trucking jobs",
    "CDL Class A jobs near me",
    "high paying truck driver jobs",
    "truck driver jobs 91% split",
    // Location keywords
    "trucking jobs Kent WA",
    "trucking company Washington state",
    "Pacific Northwest trucking jobs",
    "Seattle trucking jobs",
    // Job type keywords
    "OTR truck driver jobs",
    "regional truck driver jobs",
    "flatbed driver jobs",
    "reefer driver jobs",
    "dry van driver jobs",
    // Brand keywords
    "Thind Transport",
    "Thind Transport LLC",
    "Thind Transport jobs",
    // Benefit keywords  
    "truck driver sign on bonus",
    "no forced dispatch trucking",
    "weekly pay trucking jobs",
    "2024 Cascadia jobs",
  ],
  authors: [{ name: `${COMPANY_INFO.name}` }],
  creator: `${COMPANY_INFO.name}`,
  publisher: `${COMPANY_INFO.name}`,
  formatDetection: {
    telephone: true,
    email: true,
  },
  openGraph: {
    title: `Owner Operator Jobs - 91% Gross Split | ${COMPANY_INFO.name}`,
    description: `Stop keeping only 70%. Join ${COMPANY_INFO.name} and keep 91% of your gross. Family-owned, 2024 equipment, no forced dispatch. Hiring CDL drivers nationwide.`,
    url: "https://thindtransport.com",
    siteName: `${COMPANY_INFO.name}`,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/generated/fleet-kent-wa.png",
        width: 1200,
        height: 630,
        alt: `${COMPANY_INFO.name} Fleet - 2024 Freightliner Cascadias`,
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `91% Gross Split for Owner Operators | ${COMPANY_INFO.name}`,
    description: "Family-owned trucking company hiring CDL drivers. Keep 91% of your gross. 2024 equipment. No forced dispatch.",
    images: ["/images/generated/fleet-kent-wa.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add these when you have them
    // google: "your-google-verification-code",
    // bing: "your-bing-verification-code",
  },
  alternates: {
    canonical: "https://thindtransport.com",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#001F3F",
}

// Structured Data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    // Organization
    {
      "@type": "Organization",
      "@id": "https://thindtransport.com/#organization",
      name: COMPANY_INFO.name,
      url: "https://thindtransport.com",
      logo: {
        "@type": "ImageObject",
        url: "https://thindtransport.com/ar-carrier-logo.png",
        width: 512,
        height: 512,
      },
      description: "Family-owned trucking company offering 91% gross split for owner operators. Based in Kent, WA with nationwide operations.",
      foundingDate: "2016",
      founder: {
        "@type": "Person",
        name: "Thind Family",
      },
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
          telephone: "+1-206-765-6300",
          contactType: "Recruitment",
          areaServed: "US",
          availableLanguage: ["English", "Punjabi", "Hindi"],
        },
        {
          "@type": "ContactPoint",
          email: "thindcarrier@gmail.com",
          contactType: "Customer Service",
        }
      ],
      sameAs: [
        // Add social media URLs when available
      ],
    },
    // WebSite
    {
      "@type": "WebSite",
      "@id": "https://thindtransport.com/#website",
      url: "https://thindtransport.com",
      name: `${COMPANY_INFO.name}`,
      publisher: { "@id": "https://thindtransport.com/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://thindtransport.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    // Job Posting - Owner Operator
    {
      "@type": "JobPosting",
      title: "Owner Operator - 91% Gross Split",
      description: `${COMPANY_INFO.name} is hiring owner operators with CDL Class A. Keep 91% of your gross revenue with 100% fuel surcharge pass-through. No forced dispatch. 2024 Cascadia equipment available for lease purchase. Nationwide lanes with focus on Pacific Northwest. Weekly direct deposit.`,
      identifier: {
        "@type": "PropertyValue",
        name: `${COMPANY_INFO.name}`,
        value: "OO-91-2025",
      },
      datePosted: "2025-01-01",
      validThrough: "2025-12-31",
      employmentType: "CONTRACTOR",
      hiringOrganization: {
        "@id": "https://thindtransport.com/#organization",
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
          minValue: 180000,
          maxValue: 280000,
          unitText: "YEAR",
        },
      },
      incentiveCompensation: `$${PAY_RATES.ownerOperator.signOnBonus} sign-on bonus. 91% of gross revenue. 100% fuel surcharge pass-through.`,
      qualifications: "Valid CDL Class A license. 2+ years OTR experience. Clean driving record. Own or lease truck (lease purchase available).",
      responsibilities: "Haul freight nationwide. Maintain communication with dispatch. Follow DOT regulations. Manage own business operations.",
      skills: "CDL Class A, OTR experience, Clean MVR, Business management",
      industry: "Transportation and Logistics",
      occupationalCategory: "53-3032.00",
    },
    // Job Posting - Company Driver
    {
      "@type": "JobPosting", 
      title: "CDL Class A Company Driver",
      description: `${COMPANY_INFO.name} hiring company drivers. Competitive pay ${PAY_RATES.companyDriver.otr.annual} annually. Drive 2024 Freightliner Cascadias. Full benefits, 401k, paid time off. No forced dispatch. Flexible home time options. Regional and OTR positions available.`,
      identifier: {
        "@type": "PropertyValue",
        name: `${COMPANY_INFO.name}`,
        value: "CD-2025",
      },
      datePosted: "2025-01-01",
      validThrough: "2025-12-31",
      employmentType: "FULL_TIME",
      hiringOrganization: {
        "@id": "https://thindtransport.com/#organization",
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
          maxValue: 95000,
          unitText: "YEAR",
        },
      },
      incentiveCompensation: `${PAY_RATES.companyDriver.signOnBonus} sign-on bonus. Performance bonuses. Referral bonuses.`,
      jobBenefits: "Health insurance, 401k, Paid time off, Flexible scheduling",
      qualifications: "Valid CDL Class A license. 1+ year experience. Clean driving record.",
      industry: "Transportation and Logistics",
      occupationalCategory: "53-3032.00",
    },
    // FAQ Schema
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `What percentage do owner operators keep at ${COMPANY_INFO.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "Owner operators keep 91% of the gross revenue on every load, plus 100% of the fuel surcharge is passed through. This is significantly higher than the industry average of 65-75%.",
          },
        },
        {
          "@type": "Question",
          name: `Does ${COMPANY_INFO.name} have forced dispatch?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "No, we never use forced dispatch. You choose your loads and your schedule. We believe in treating drivers as partners, not numbers.",
          },
        },
        {
          "@type": "Question",
          name: `What equipment does ${COMPANY_INFO.name} use?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "We operate a modern fleet of 2024 Freightliner Cascadias with Detroit DD15 engines and DT12 automated transmissions. Average fleet age is under 2 years.",
          },
        },
        {
          "@type": "Question",
          name: `How often does ${COMPANY_INFO.name} pay?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: "We pay weekly via direct deposit. No waiting 30-45 days for your money. Quick pay options are also available.",
          },
        },
      ],
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`scroll-smooth ${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="canonical" href="https://thindtransport.com/" />
        
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="msapplication-TileColor" content="#001F3F" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <SmoothScroll>
          <ActiveBackground />
          
          {/* Skip to main content - Accessibility */}
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-orange focus:text-white focus:rounded-lg focus:shadow-lg focus:font-semibold"
          >
            Skip to main content
          </a>

          {/* Header Navigation */}
          <CinematicNavbar />

          {/* Main Content Area */}
          <main id="main-content" className="min-h-screen" role="main">
            {children}
          </main>

          {/* Footer */}
          <CinematicFooter />
          <CommandBar />
          <MobileCommandBar />

          {/* Conversion Optimization */}
          <LeadMagnetModal />
          <QuickContactWidget />
          <ExitIntentPopup />
          <StickyMobileCTA />
          <RecentlyHiredTicker variant="popup" />
          <BackToTop />
          
          {/* Notifications */}
          <Toaster />
        </SmoothScroll>
      </body>
    </html>
  )
}
