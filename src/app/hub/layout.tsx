import type { Metadata, Viewport } from "next"
import { SessionProvider } from "next-auth/react"

export const metadata: Metadata = {
  title: { default: "Thind Transport Hub", template: "%s | Thind Hub" },
  robots: { index: false, follow: false },
  manifest: "/hub.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Thind Hub",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0E1621",
}

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `
    (() => {
      try {
        const accent = localStorage.getItem("hauldesk-accent") || "graphite";
        const mode = localStorage.getItem("hauldesk-mode") || "system";
        const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.dataset.hauldeskAccent = accent;
        document.documentElement.dataset.hauldeskMode = mode;
        document.documentElement.classList.toggle("hauldesk-dark", dark);
      } catch {}
    })();
  `
  return (
    <SessionProvider>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      {children}
    </SessionProvider>
  )
}
