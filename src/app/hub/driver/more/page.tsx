import Link from "next/link"
import { CalendarOff, ChevronRight, ClipboardCheck, FileText, ShieldAlert } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import { getCarrier } from "@/lib/hub/settings"
import { PushManager } from "@/components/hub/PushManager"
import { SignOutButton } from "@/components/hub/SignOutButton"

export const dynamic = "force-dynamic"

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
      <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-white">More</h1>

      <ul className="space-y-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-800/80 p-4 hover:bg-white/5 min-h-[64px]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gold">
                <link.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">{link.label}</span>
                <span className="block text-body-xs text-steel-300">{link.hint}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-steel-400" />
            </Link>
          </li>
        ))}
      </ul>

      {phone ? (
        <a
          href={`tel:${phone}`}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-gold/50 bg-gold/10 font-display text-sm font-bold uppercase tracking-[0.08em] text-gold hover:bg-gold/20"
        >
          Call the office: {carrier?.phone}
        </a>
      ) : null}

      <PushManager />

      <div className="rounded-2xl border border-white/10 bg-navy-800/80 p-4">
        <p className="text-sm font-semibold text-white">{user.name}</p>
        <p className="text-body-xs text-steel-300 mb-3">{user.email} · {carrier?.name}</p>
        <SignOutButton />
      </div>
    </div>
  )
}
