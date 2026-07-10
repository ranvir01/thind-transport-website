import Link from "next/link"
import { Cable, ChevronRight, FileBadge, Tags, Users } from "lucide-react"
import { requireOfficeUser } from "@/lib/hub/session"
import { PageHeader, Panel } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

// Bare /hub/settings was a 404 — nothing linked it, but it's the first URL
// anyone guesses. Index the section, gated the same way the nav gates it.
const AREAS = [
  {
    href: "/hub/settings/users",
    label: "Company & users",
    hint: "Carrier profile, pay rules, notifications, who can log in",
    icon: Users,
    ownerOnly: true,
  },
  {
    href: "/hub/settings/integrations",
    label: "Integrations",
    hint: "ELD, fuel cards, load boards, mailbox — every feed with a CSV fallback",
    icon: Cable,
    ownerOnly: true,
  },
  {
    href: "/hub/settings/packet",
    label: "Carrier packet",
    hint: "W-9, COI, authority — the documents brokers ask for, one link",
    icon: FileBadge,
    ownerOnly: false,
  },
  {
    href: "/hub/settings/pricebook",
    label: "Price book",
    hint: "Lane rates and accessorial defaults that prefill quotes",
    icon: Tags,
    ownerOnly: false,
  },
] as const

export default async function SettingsIndexPage() {
  const user = await requireOfficeUser()
  const areas = AREAS.filter((area) => !area.ownerOnly || user.role === "owner")

  return (
    <div>
      <PageHeader title="Settings" subtitle="Company configuration, connections, and shared documents." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map((area) => (
          <Link key={area.href} href={area.href}>
            <Panel className="flex items-center gap-3 p-4 hover:bg-hover transition-colors">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                <area.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-fg">{area.label}</span>
                <span className="block text-body-xs text-fg-3">{area.hint}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-fg-3" />
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  )
}
