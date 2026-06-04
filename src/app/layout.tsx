import type { Metadata, Viewport } from "next"
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google"
import "./globals.css"
import { CinematicNavbar } from "@/components/cinematic/Navbar"
import { ActiveBackground } from "@/components/ui/ActiveBackground"
import { SmoothScroll } from "@/components/cinematic/SmoothScroll"
import { CinematicFooter, CommandBar, MobileCommandBar } from "@/components/cinematic/Footer"
import { BackToTop } from "@/components/shared/BackToTop"
import { Toaster } from "@/components/ui/sonner"
import { COMPANY_INFO } from "@/lib/constants"
import { SchemaMarkup } from "@/components/features/SchemaMarkup"
import { Providers } from "./providers"

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["600", "700", "800"],
})

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

// SEO-Optimized Metadata
export const metadata: Metadata = {
  metadataBase: new URL("https://thindtransport.com"),
  title: {
    default: `${COMPANY_INFO.name} | Family-Run Trucking Company in Kent, WA`,
    template: `%s | ${COMPANY_INFO.name}`,
  },
  description: `${COMPANY_INFO.name} is a family-run carrier in Kent, WA hiring CDL-A drivers. Owner operators keep 90% of gross; company drivers earn $0.63/mile. 2024 Cascadias, weekly pay, no forced dispatch, and dispatch that actually answers the phone.`,
  keywords: [
    "Thind Transport",
    "Kent WA trucking company",
    "family owned trucking company",
    "owner operator jobs 90 percent",
    "CDL Class A jobs Washington",
    "company driver jobs $0.63 per mile",
    "flatbed reefer dry van carrier",
    "Pacific Northwest trucking jobs",
    "no forced dispatch trucking",
  ],
  authors: [{ name: `${COMPANY_INFO.name}` }],
  creator: `${COMPANY_INFO.name}`,
  publisher: `${COMPANY_INFO.name}`,
  formatDetection: {
    telephone: true,
    email: true,
  },
  openGraph: {
    title: `${COMPANY_INFO.name} | Drive for a Family-Run Carrier in Kent, WA`,
    description: `90% gross for owner operators, $0.63/mile for company drivers, 2024 Cascadias, and weekly pay. Flatbed, reefer, and dry van — with dispatch that knows your name.`,
    url: "https://thindtransport.com",
    siteName: `${COMPANY_INFO.name}`,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/branding/thind-transport-logo-white.svg",
        width: 512,
        height: 512,
        alt: `${COMPANY_INFO.name} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPANY_INFO.name} | Drive for a Family-Run Carrier`,
    description: "90% gross for owner operators, $0.63/mile for company drivers, 2024 Cascadias, weekly pay, no forced dispatch.",
    images: ["/branding/thind-transport-logo-white.svg"],
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
  alternates: {
    canonical: "https://thindtransport.com",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0E1621",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`scroll-smooth ${barlowCondensed.variable} ${sourceSans.variable}`}>
      <head>
        <link rel="canonical" href="https://thindtransport.com/" />
        
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="msapplication-TileColor" content="#0E1621" />
        
        {/* Structured Data - Injected via SchemaMarkup component */}
        <SchemaMarkup />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${sourceSans.className} antialiased overflow-x-hidden`} suppressHydrationWarning>
        <Providers>
          <SmoothScroll>
            <ActiveBackground />
          
          {/* Skip to main content - Accessibility */}
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-orange focus:text-white focus:rounded-lg focus:shadow-lg focus:font-semibold focus:font-display"
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

          <BackToTop />
          
        </SmoothScroll>
        </Providers>
      </body>
    </html>
  )
}
