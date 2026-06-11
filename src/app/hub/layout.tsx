import type { Metadata, Viewport } from "next"
import { SessionProvider } from "next-auth/react"
import { PRODUCT } from "@/lib/hub/product"

export const metadata: Metadata = {
  title: { default: PRODUCT.name, template: `%s | ${PRODUCT.name}` },
  robots: { index: false, follow: false },
  manifest: "/hub.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: PRODUCT.shortName,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0E1621",
}

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
