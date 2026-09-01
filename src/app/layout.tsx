import type { Metadata, Viewport } from "next"
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google"
import "./globals.css"
import { CinematicNavbar } from "@/components/cinematic/Navbar"
import {
  CinematicFooter,
  MobileCommandBar,
} from "@/components/cinematic/Footer"
import { BackToTop } from "@/components/shared/BackToTop"
import { AttributionCapture } from "@/components/shared/AttributionCapture"
import { SkipLink } from "@/components/shared/SkipLink"
import { COMPANY_INFO, EQUIPMENT, PAY_RATES } from "@/lib/constants"
import { SchemaMarkup } from "@/components/features/SchemaMarkup"
import { SITE_ICONS } from "@/lib/site-icons"
import { InstalledAppRedirect } from "@/components/shared/InstalledAppRedirect"
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
  description: `${COMPANY_INFO.name} is a family-run carrier in Kent, WA hiring CDL-A drivers. Owner operators keep ${PAY_RATES.ownerOperator.commission} of gross; company drivers earn ${PAY_RATES.companyDriver.otr.perMile}/mile. ${EQUIPMENT.modelYears} ${EQUIPMENT.makes}, weekly pay, no forced dispatch, and dispatch that actually answers the phone.`,
  keywords: [
    "Thind Transport",
    "Kent WA trucking company",
    "family owned trucking company",
    `owner operator jobs ${PAY_RATES.ownerOperator.commission.replace("%", "")} percent`,
    "CDL Class A jobs Washington",
    `company driver jobs ${PAY_RATES.companyDriver.otr.perMile} per mile`,
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
    description: `${PAY_RATES.ownerOperator.commission} gross for owner operators, ${PAY_RATES.companyDriver.otr.perMile}/mile for company drivers, ${EQUIPMENT.modelYears} ${EQUIPMENT.makes}, and weekly pay. Flatbed, reefer, and dry van — with dispatch that knows your name.`,
    url: "https://thindtransport.com",
    siteName: `${COMPANY_INFO.name}`,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${COMPANY_INFO.name} — keep ${PAY_RATES.ownerOperator.commission} of your gross. Family-run carrier in Kent, WA.`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPANY_INFO.name} | Drive for a Family-Run Carrier`,
    description: `${PAY_RATES.ownerOperator.commission} gross for owner operators, ${PAY_RATES.companyDriver.otr.perMile}/mile for company drivers, ${EQUIPMENT.modelYears} ${EQUIPMENT.makes}, weekly pay, no forced dispatch.`,
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
  // mark on the home screen. As metadata, an install page's set replaces this
  // one instead of stacking with it.
  icons: SITE_ICONS,
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
          {/* Any home-screen icon that lands outside the app — including the
              ones iOS pinned to "/" before the install fix, which no amount of
              shipping can retarget — is handed to /hub. Renders nothing for an
              ordinary browser visit. */}
          <InstalledAppRedirect />

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
            enable Web Analytics in the Vercel dashboard for data to land.
            Gated on the VERCEL system env var (set to "1" only on Vercel's
            own build/runtime) — both components unconditionally inject a
            <script src="/_vercel/.../script.js"> that only Vercel's edge
            serves, so every self-hosted `next start` (the whole local e2e
            rig) 404'd on every single page load otherwise. */}
        {process.env.VERCEL === "1" && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  )
}
