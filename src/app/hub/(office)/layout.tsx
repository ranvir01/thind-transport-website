import { requireOfficeUser } from "@/lib/hub/session"
import { HubNav } from "@/components/hub/HubNav"

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOfficeUser()

  return (
    <div className="min-h-screen">
      <HubNav user={{ name: user.name, role: user.role }} />
      {/* Mobile: top bar (56px) + bottom tabs; Desktop: 240px sidebar */}
      <main className="pt-[72px] pb-24 px-4 lg:pt-8 lg:pb-12 lg:pl-[264px] lg:pr-8 max-w-[1400px]">
        {children}
      </main>
    </div>
  )
}
