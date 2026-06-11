import { requireDriverUser } from "@/lib/hub/session"
import { DriverNav } from "@/components/hub/driver/DriverNav"

export default async function DriverAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDriverUser()

  return (
    <div className="min-h-screen bg-navy">
      <DriverNav firstName={user.name.split(" ")[0]} />
      {/* Top bar 56px, bottom tabs 64px + safe area */}
      <main className="pt-16 pb-24 px-4 mx-auto w-full max-w-lg">{children}</main>
    </div>
  )
}
