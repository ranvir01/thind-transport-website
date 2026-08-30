import type { Metadata, Viewport } from "next"
import { SessionProvider } from "next-auth/react"
import Script from "next/script"
import { auth } from "@/lib/auth"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import { PRODUCT } from "@/lib/hub/product"
import { APP_ICONS } from "@/lib/site-icons"
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
  icons: { ...APP_ICONS, icon: [{ url: "/hub-icon-192.png", type: "image/png", sizes: "192x192" }] },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: PRODUCT.shortName,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Match the header surface in each mode so the iOS status bar blends in.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14161f" },
  ],
  // Drivers use the app one-handed in a cab; let it fill past the notch/home
  // indicator so the bottom action bar isn't squeezed by the safe-area inset.
  viewportFit: "cover",
}

// The empty passive touchstart listener is required for iOS Safari to apply
// :active states on first touch — the CSS press feedback in hub-theme.css
// does nothing on iPhones without it.
// The office mode comes from localStorage, NOT from the OS, so the static
// prefers-color-scheme theme-color pair above is wrong for /hub: an iPhone set
// to dark showed a #14161f address bar above a white office page, which reads
// as a half-broken dark mode rather than a light app. Overwrite the meta with
// the mode we actually resolved. Driver and portal are navy regardless of the
// stored mode — they are forced-dark surfaces.
const themeBoot = `(function(){try{var p=location.pathname;if(!p.startsWith('/hub'))return;var m=localStorage.getItem('hauldesk-mode')||'light';var t=localStorage.getItem('hauldesk-theme')||'indigo';var r=document.documentElement;r.setAttribute('data-app','hauldesk');r.setAttribute('data-mode',m);r.setAttribute('data-theme',t);var forcedDark=/^\\/hub\\/(driver|portal)(\\/|$)/.test(p);var bar=forcedDark?'#121316':(m==='dark'?'#08090d':'#fbfbfd');var tags=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<tags.length;i++)tags[i].parentNode.removeChild(tags[i]);var meta=document.createElement('meta');meta.setAttribute('name','theme-color');meta.setAttribute('content',bar);document.head.appendChild(meta);document.addEventListener('touchstart',function(){},{passive:true});}catch(e){}})();`

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
