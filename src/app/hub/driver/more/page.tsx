import Link from "next/link"
import { CalendarOff, ChevronRight, ClipboardCheck, FileText, ShieldAlert } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import { getCarrier } from "@/lib/hub/settings"
import { InstallAppButton } from "@/components/hub/InstallAppButton"
import { PushManager } from "@/components/hub/PushManager"
import { SignOutButton } from "@/components/hub/SignOutButton"
import { btnDriverSecondaryCls } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

/** Same border/background mix OfflineSync uses for --driver-accent chrome (opacity modifiers drop silently on CSS-var colors — AGENTS.md). */
const ACCENT_BUTTON_STYLE = {
  borderColor: "color-mix(in srgb, var(--driver-accent) 50%, transparent)",
  backgroundColor: "color-mix(in srgb, var(--driver-accent) 10%, transparent)",
} as const

const LINKS = [
  { href: "/hub/driver/dvir", label: "Vehicle inspection (DVIR)", hint: "Pre/post-trip — two minutes, phone in hand", icon: ClipboardCheck },
  { href: "/hub/driver/docs", label: "My documents", hint: "CDL, med card, expiry warnings", icon: FileText },
  { href: "/hub/driver/timeoff", label: "Time off", hint: "Ask for home time", icon: CalendarOff },
  { href: "/hub/driver/incident", label: "Report an incident", hint: "Accidents, damage, roadside events", icon: ShieldAlert },
]

export default async function DriverMorePage() {
  const user = await requireDriverUser()
  const carrier = await getCarrier(user.carrierId)
  const phone = carrier?.phone?.replace(/[^0-9+]/g, "")

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-semibold text-white">More</h1>

      {/* Orientation (#86): the three things a new driver needs to know, on the
          one screen every tab leads back to. */}
      <section className="driver-card p-4">
        <p className="font-display text-[11px] font-semibold uppercase tracking-wide text-steel-300">How to use this app</p>
        <ul className="mt-2 list-disc pl-4 space-y-1.5 text-body-sm text-steel-200">
          <li>Confirm the load, tap I&apos;m here / Leaving now, then Snap &amp; send the POD.</li>
          <li>Pay, documents, DVIR, and time off live under these tabs — no hunting menus.</li>
          <li>No signal? Taps queue and send themselves when you&apos;re back online.</li>
        </ul>
      </section>

      <ul className="hub-stagger space-y-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="driver-card flex min-h-[56px] items-center gap-3 p-4 transition-colors hover:bg-driver-surface-2"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-white/[0.06] text-[color:var(--driver-accent)]">
                <link.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">{link.label}</span>
                <span className="block text-[13px] text-steel-300">{link.hint}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-steel-300" />
            </Link>
          </li>
        ))}
      </ul>

      {phone ? (
        <a
          href={`tel:${phone}`}
          className={cn(btnDriverSecondaryCls, "text-[color:var(--driver-accent)]")}
          style={ACCENT_BUTTON_STYLE}
        >
          Call the office: {carrier?.phone}
        </a>
      ) : null}

      <InstallAppButton />
      <PushManager />

      <div className="driver-card p-4">
        <p className="text-base font-semibold text-white">{user.name}</p>
        <p className="mb-3 text-[13px] text-steel-300">{user.email} · {carrier?.name}</p>
        <SignOutButton variant="dark" />
      </div>
    </div>
  )
}
