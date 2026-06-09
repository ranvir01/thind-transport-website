import type { Metadata } from "next"
import { DriverSessionProvider } from "./session-provider"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return <DriverSessionProvider>{children}</DriverSessionProvider>
}
