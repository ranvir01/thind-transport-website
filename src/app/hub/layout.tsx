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
  // No themeColor here on purpose. It used to be a prefers-color-scheme pair,
  // which put a #14161f status bar above a WHITE office page on any phone set
  // to dark — the office mode comes from localStorage, never the OS.
  //
  // The root layout's own "#121316" still reaches /hub, and React re-hoists
  // metadata after hydration, so neither tag ORDER nor tag COUNT is
  // controllable from a script. The boot script below therefore rewrites the
  // content of every theme-color tag it finds and keeps watching <head>, which
  // makes both moot (lib/hub/appearance.ts does the same on the live toggle).
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
// the mode we actually resolved. Driver, portal and the driver-invite landing
// are navy regardless of the stored mode — they are forced-dark surfaces
// (driver-invite was missed once: white overscroll flash on a navy page).
const themeBoot = `(function(){try{var p=location.pathname;if(!p.startsWith('/hub'))return;var m=localStorage.getItem('hauldesk-mode')||'light';var t=localStorage.getItem('hauldesk-theme')||'indigo';var r=document.documentElement;r.setAttribute('data-app','hauldesk');r.setAttribute('data-mode',m);r.setAttribute('data-theme',t);var forcedDark=/^\\/hub\\/(driver|portal|driver-invite)(\\/|$)/.test(p);if(forcedDark)r.setAttribute('data-surface','dark');var bar=forcedDark?'#121316':(m==='dark'?'#08090d':'#fbfbfd');var paint=function(){var tags=document.head.querySelectorAll('meta[name="theme-color"]');if(!tags.length){var meta=document.createElement('meta');meta.setAttribute('name','theme-color');document.head.appendChild(meta);tags=[meta];}for(var i=0;i<tags.length;i++){tags[i].removeAttribute('media');tags[i].setAttribute('content',bar);}};paint();if(window.MutationObserver){new MutationObserver(paint).observe(document.head,{childList:true});}document.addEventListener('touchstart',function(){},{passive:true});}catch(e){}})();`

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
