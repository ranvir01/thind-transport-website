import type { Metadata, Viewport } from "next"
import { SessionProvider } from "next-auth/react"
import Script from "next/script"
import { auth } from "@/lib/auth"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import { PRODUCT } from "@/lib/hub/product"
import { ServiceWorkerBoot } from "@/components/hub/ServiceWorkerBoot"
import { StandaloneScopeGuard } from "@/components/hub/StandaloneScopeGuard"
import "./hub-theme.css"

export const metadata: Metadata = {
  // `absolute`, not `default`: a nested layout's `default` still runs through
  // the ROOT template, so every hub page without its own title rendered
  // "LoadOff | Thind Transport" — including /hub/login, the page the installed
  // app opens on. iOS falls back to <title> when naming a home-screen icon, so
  // the app's own pages must never carry the carrier's name.
  title: { absolute: PRODUCT.name, template: `%s | ${PRODUCT.name}` },
  robots: { index: false, follow: false },
  manifest: "/api/hub/manifest",
  // Overrides the root layout's marketing icons for every /hub route. iOS
  // takes the home-screen icon from apple-touch-icon before it looks at the
  // manifest, so without a LoadOff one here the installed app wore the Thind
  // Transport truck mark.
  icons: {
    icon: [{ url: "/hub-icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/hub-icon-180.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: PRODUCT.shortName,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBFBFC",
  // Drivers use the app one-handed in a cab; let it fill past the notch/home
  // indicator so the bottom action bar isn't squeezed by the safe-area inset.
  viewportFit: "cover",
}

const themeBoot = `(function(){try{var p=location.pathname;if(!p.startsWith('/hub'))return;var m=localStorage.getItem('hauldesk-mode')||'light';var t=localStorage.getItem('hauldesk-theme')||'indigo';var r=document.documentElement;r.setAttribute('data-app','hauldesk');r.setAttribute('data-mode',m);r.setAttribute('data-theme',t);}catch(e){}})();`

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  // Seed the client SessionProvider from the server so it skips its initial
  // /api/auth/session fetch — that fetch racing the post-login redirect was
  // the sporadic authjs "Failed to fetch" console error on first load.
  const session = await auth()
  return (
    <div
      className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased min-h-screen bg-bg text-fg`}
    >
      {/* Next emits only the standardised `mobile-web-app-capable` from
          appleWebApp.capable. iOS Safari still keys standalone launch off the
          apple-prefixed name, and most of our drivers are on iPhones — without
          it the home-screen icon opens in a Safari tab with browser chrome
          instead of as an app. Harmless duplicate on Android. */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <Script id="hauldesk-theme-boot" strategy="beforeInteractive">
        {themeBoot}
      </Script>
      <ServiceWorkerBoot />
      <StandaloneScopeGuard />
      <SessionProvider session={session}>{children}</SessionProvider>
    </div>
  )
}
