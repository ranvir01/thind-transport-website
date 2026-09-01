import Link from "next/link"
import { requireOfficeUser } from "@/lib/hub/session"
import { PageHeader, Panel, Pill } from "@/components/hub/ui"
import { listProspects, countByStatus } from "@/lib/hub/outreach/prospects"
import type { Audience } from "@/lib/hub/outreach/draft"
import { OutreachImport } from "./OutreachImport"
import { ProspectRow } from "./ProspectRow"

export const dynamic = "force-dynamic"

const AUDIENCES: { key: Audience; label: string; blurb: string }[] = [
  { key: "broker", label: "Brokers", blurb: "Freight brokers to haul for — pitch our authority, equipment, and live tracking." },
  { key: "shipper", label: "Shippers", blurb: "Companies that ship direct — cut out the broker markup." },
  { key: "driver", label: "Drivers", blurb: "CDL-A drivers and owner-ops — the 91% split and weekly pay." },
]

/**
 * Outbound outreach — the company-side of lead-gen. Import prospects, let the
 * system draft on-brand messages, review, then send. Nothing goes out until a
 * human clicks Approve & send.
 */
export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>
}) {
  const user = await requireOfficeUser()
  const sp = await searchParams
  const audience: Audience =
    sp.audience === "shipper" || sp.audience === "driver" ? sp.audience : "broker"

  const [counts, prospects] = await Promise.all([
    countByStatus(user.carrierId),
    listProspects(user.carrierId, { audience, limit: 200 }).catch(() => []),
  ])
  const active = AUDIENCES.find((a) => a.key === audience)!

  return (
    <div>
      <PageHeader
        title="Outreach"
        subtitle="Reach out to brokers, shippers, and drivers on the company's behalf — Claude drafts it, you approve before it sends."
      />

      {/* Pipeline snapshot */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Pill tone="neutral">{counts.total} prospects</Pill>
        {counts.new > 0 && <Pill tone="accent">{counts.new} to draft</Pill>}
        {counts.drafted > 0 && <Pill tone="warn">{counts.drafted} awaiting review</Pill>}
        {counts.sent > 0 && <Pill tone="info">{counts.sent} sent</Pill>}
        {counts.replied > 0 && <Pill tone="ok">{counts.replied} replied</Pill>}
        {counts.converted > 0 && <Pill tone="ok">{counts.converted} converted</Pill>}
        {counts.suppressed > 0 && <Pill tone="neutral">{counts.suppressed} opted out</Pill>}
      </div>

      {/* Audience tabs */}
      <div className="mb-4 flex gap-2 border-b border-border">
        {AUDIENCES.map((a) => (
          <Link
            key={a.key}
            href={`/hub/outreach?audience=${a.key}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${
              a.key === audience
                ? "border-accent text-fg"
                : "border-transparent text-fg-3 hover:text-fg-2"
            }`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      <p className="mb-4 text-body-sm text-fg-3">{active.blurb}</p>

      <OutreachImport audience={audience} />

      <Panel className="mt-4 divide-y divide-border">
        {prospects.length === 0 ? (
          <p className="p-4 text-body-sm text-fg-3">
            No {active.label.toLowerCase()} yet. Paste a list above to get started — one per line,
            or a CSV with columns like name, company, email, phone, lane.
          </p>
        ) : (
          prospects.map((p) => <ProspectRow key={p.id} prospect={p} />)
        )}
      </Panel>

      <p className="mt-4 text-body-xs text-fg-3">
        Every message carries our address and a one-line opt-out, and anyone who replies STOP is
        suppressed — that keeps outreach CAN-SPAM compliant. Cold SMS is intentionally copy-only
        (texting contacts who didn&apos;t opt in is a legal risk); email is the sendable channel.
      </p>
    </div>
  )
}
