import type { Metadata, Viewport } from "next"
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google"
import "./globals.css"
import { CinematicNavbar } from "@/components/cinematic/Navbar"
import { ActiveBackground } from "@/components/ui/ActiveBackground"
import {
  CinematicFooter,
  MobileCommandBar,
} from "@/components/cinematic/Footer"
import { BackToTop } from "@/components/shared/BackToTop"
import { AttributionCapture } from "@/components/shared/AttributionCapture"
import { SkipLink } from "@/components/shared/SkipLink"
import { COMPANY_INFO } from "@/lib/constants"
import { SchemaMarkup } from "@/components/features/SchemaMarkup"
import { Providers } from "./providers"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["600", "700", "800"],
})

// display: "optional" — the font is preloaded and almost always ready by first
// paint; on very slow connections we keep the fallback instead of triggering a
// late repaint of the hero copy (which would push LCP out by seconds).
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  adjustFontFallback: true,
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
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${COMPANY_INFO.name} — keep 90% of your gross. Family-run carrier in Kent, WA.`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPANY_INFO.name} | Drive for a Family-Run Carrier`,
    description:
      "90% gross for owner operators, $0.63/mile for company drivers, 2024 Cascadias, weekly pay, no forced dispatch.",
    images: ["/og-image.png"],
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
    canonical: "/",
  },
  // Metadata-declared so the hub layout's own manifest cleanly overrides it on
  // /hub routes (Next dedupes these; a hardcoded <link> in JSX is not deduped).
  manifest: "/site.webmanifest",
  // Same reason the manifest is metadata-declared: these used to be literal
  // <link> tags in the <head> below, which render on EVERY route — including
  // /hub, where the LoadOff app declares its own icons. iOS picks the
  // home-screen icon from <link rel="apple-touch-icon"> in preference to the
  // manifest icons, so installing the driver app got the Thind Transport truck
  // mark on the home screen. As metadata, the hub layout's set replaces this
  // one on /hub routes instead of stacking with it.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#121316",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`scroll-smooth ${barlowCondensed.variable} ${sourceSans.variable}`}
    >
      <head>
        {/* Favicons and the apple-touch-icon are declared via `metadata.icons`
            (above), never as literal tags here — a hardcoded icon renders on
            every route including /hub, and iOS prefers apple-touch-icon over
            the manifest's icons, so the LoadOff app inherited the Thind
            Transport mark on the home screen. Same rule as the manifest: */}
        {/* The web app manifest is declared via `metadata.manifest` (above),
            never as a literal tag here. A hardcoded one renders on EVERY route
            including /hub, where the hub layout declares its own LoadOff
            manifest — Next only dedupes tags it generates from metadata, so the
            head ended up with two of them and browsers honour the first.
            Drivers adding the app to their home screen got the marketing site
            (start_url "/") instead of the driver app (start_url "/hub"). */}
        <meta name="msapplication-TileColor" content="#121316" />

        {/* Structured Data - Injected via SchemaMarkup component */}
        <SchemaMarkup />
        {/* Records where this visit came from, once, wherever they land. */}
        <AttributionCapture />
      </head>
      <body
        className={`${sourceSans.className} antialiased overflow-x-hidden`}
        suppressHydrationWarning
      >
        <Providers>
          <ActiveBackground />

          {/* Skip to main content - Accessibility */}
          <SkipLink />

          {/* Header Navigation */}
          <CinematicNavbar />

          {/* Main Content Area */}
          <main id="main-content" className="min-h-screen" role="main">
            {children}
          </main>

          {/* Footer */}
          <CinematicFooter />
          <MobileCommandBar />

          <BackToTop />
        </Providers>

        {/* Cookieless, anonymous analytics (Vercel Web Analytics + Speed
            Insights): no cross-site tracking, no PII in any custom event —
            funnel events carry step/source/device class only. Ranvir must
            enable Web Analytics in the Vercel dashboard for data to land. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
