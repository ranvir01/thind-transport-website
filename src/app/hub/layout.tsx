import type { Metadata, Viewport } from "next"
import { SessionProvider } from "next-auth/react"
import Script from "next/script"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import { PRODUCT } from "@/lib/hub/product"
import "./hub-theme.css"

export const metadata: Metadata = {
  title: { default: PRODUCT.name, template: `%s | ${PRODUCT.name}` },
  robots: { index: false, follow: false },
  manifest: "/hub.webmanifest",
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
}

const themeBoot = `(function(){try{var p=location.pathname;if(!p.startsWith('/hub'))return;var m=localStorage.getItem('hauldesk-mode')||'light';var t=localStorage.getItem('hauldesk-theme')||'indigo';var r=document.documentElement;r.setAttribute('data-app','hauldesk');r.setAttribute('data-mode',m);r.setAttribute('data-theme',t);}catch(e){}})();`

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased min-h-screen bg-bg text-fg`}
    >
      <Script id="hauldesk-theme-boot" strategy="beforeInteractive">
        {themeBoot}
      </Script>
      <SessionProvider>{children}</SessionProvider>
    </div>
  )
}
