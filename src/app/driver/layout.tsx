import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { DriverSessionProvider } from "./session-provider"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return <DriverSessionProvider session={session}>{children}</DriverSessionProvider>
}
