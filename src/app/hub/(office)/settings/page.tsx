import Link from "next/link"
import { Cable, ChevronRight, FileBadge, Palette, Smartphone, Tags, TrendingUp, Users, Wallet } from "lucide-react"
import { requireOfficeUser } from "@/lib/hub/session"
import { PageHeader, Panel } from "@/components/hub/ui"
import { SecurityPanel } from "@/components/hub/SecurityPanel"

export const dynamic = "force-dynamic"

// Bare /hub/settings was a 404 — nothing linked it, but it's the first URL
// anyone guesses. Index the section, gated the same way the nav gates it.
const AREAS = [
  {
    href: "/hub/settings/users",
    label: "Company & users",
    hint: "Company profile, the office alert email, and who can log in",
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
    href: "/hub/settings/branding",
    label: "Branding",
    hint: "Accent color on invoices, PDFs, and the driver app",
    icon: Palette,
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
    href: "/hub/settings/pay-rules",
    label: "Driver pay",
    hint: "Per-mile, percentage, stop pay and weekly deductions — what settlements compute from",
    icon: Wallet,
    ownerOnly: false,
  },
  {
    href: "/hub/settings/operating-cost",
    label: "Cost per mile",
    hint: "The all-in cost every margin and lane ranking is priced from — measured against your own books",
    icon: TrendingUp,
    ownerOnly: false,
  },
  {
    href: "/hub/settings/pricebook",
    label: "Price book",
    hint: "Lane rates and accessorial defaults that prefill quotes",
    icon: Tags,
    ownerOnly: false,
  },
  {
    href: "/hub/settings/app",
    label: "Phone app",
    hint: "Install LoadOff on your phone — alerts, offline, no app store",
    icon: Smartphone,
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
      {/* Personal, not company config: every signed-in user manages their
          own second factor, so it lives on the index rather than an
          owner-gated sub-page. */}
      <div className="mt-4">
        <SecurityPanel />
      </div>
    </div>
  )
}
