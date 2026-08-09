import Link from "next/link"
import { Plus, CalendarClock } from "lucide-react"
import { listClaims, daysToDeadline, type Claim } from "@/lib/hub/claims"
import { fmtCents } from "@/lib/hub/types"
import { requirePermissionPage } from "@/lib/hub/session"
import { PageHeader, Panel, EmptyState, BackLink } from "@/components/hub/ui"
import { HelpTip } from "@/components/hub/HelpTip"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<Claim["status"], string> = {
  open: "Open",
  filed: "Filed",
  settled: "Settled",
  denied: "Denied",
  closed: "Closed",
}

const KIND_LABEL: Record<Claim["kind"], string> = {
  cargo: "Cargo",
  property: "Property",
  injury: "Injury",
}

export default async function ClaimsPage() {
  const user = await requirePermissionPage("compliance:read")
  const claims = await listClaims(user.carrierId)
  const active = claims.filter((c) => c.status === "open" || c.status === "filed")
  const resolved = claims.filter((c) => c.status !== "open" && c.status !== "filed")

  return (
    <div>
      <BackLink href="/hub/safety" label="Safety" />
      <PageHeader
        title="Claims"
        subtitle="Cargo, property, and injury claims — with the filing clock in plain sight."
        titleExtra={
          <HelpTip title="The Carmack clock">
            For cargo claims the Carmack Amendment lets the bill of lading require written
            claims within 9 months of delivery — miss it and the claim is dead, no matter how
            good it was. Drivers noting OS&D on a POD open a draft cargo claim here
            automatically, deadline pre-set.
          </HelpTip>
        }
        action={
          <Link
            href="/hub/safety/claims/new"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" /> New claim
          </Link>
        }
      />

      {claims.length === 0 ? (
        <EmptyState
          title="No claims on file"
          hint="Good. When freight gets damaged or a shipper comes after you, open the claim here so the filing deadline never sneaks past."
          action={
            <Link href="/hub/safety/claims/new" className="inline-flex min-h-[44px] items-center rounded-control bg-accent px-5 font-semibold text-sm text-accent-fg hover:bg-accent-hover">
              Open a claim
            </Link>
          }
        />
      ) : (
        <>
          <h2 className="text-base font-semibold text-fg mb-3">
            Being worked ({active.length})
          </h2>
          {active.length === 0 ? (
            <Panel className="mb-6 p-4">
              <p className="text-body-sm text-fg-3">Nothing in flight — every claim is resolved.</p>
            </Panel>
          ) : (
            <Panel className="mb-6 divide-y divide-border">
              {active.map((c) => (
                <ClaimRow key={c.id} claim={c} />
              ))}
            </Panel>
          )}

          {resolved.length > 0 ? (
            <>
              <h2 className="text-base font-semibold text-fg mb-3">
                Resolved ({resolved.length})
              </h2>
              <Panel className="divide-y divide-border">
                {resolved.map((c) => (
                  <ClaimRow key={c.id} claim={c} />
                ))}
              </Panel>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

function ClaimRow({ claim }: { claim: Claim }) {
  const days = daysToDeadline(claim.filing_deadline)
  const working = claim.status === "open" || claim.status === "filed"
  const urgent = working && days !== null && days <= 30
  return (
    <Link
      href={`/hub/safety/claims/${claim.id}`}
      className="flex items-center justify-between gap-2 p-3 hover:bg-hover"
    >
      <div className="min-w-0">
        <p className="font-semibold text-fg truncate">
          {KIND_LABEL[claim.kind]} claim
          {claim.load_reference ? ` — ${claim.load_reference}` : ""}
          {claim.amount_cents !== null ? (
            <span className="ml-2 font-mono font-medium text-accent-text tabular-nums">
              {fmtCents(claim.amount_cents)}
            </span>
          ) : null}
        </p>
        <p className="text-body-xs text-fg-3 truncate">
          Opened {new Date(claim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          {claim.notes ? ` · ${claim.notes}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {days !== null && working ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold",
              urgent
                ? days < 0
                  ? "border-bad-soft bg-bad-soft text-bad"
                  : "border-warn-soft bg-warn-soft text-warn"
                : "border-border-strong bg-surface-2 text-fg-3"
            )}
          >
            <CalendarClock className="h-3 w-3" />
            {days < 0 ? `${-days}d past deadline` : days === 0 ? "File TODAY" : `${days}d to file`}
          </span>
        ) : null}
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
            working
              ? "border-warn-soft bg-warn-soft text-warn"
              : "border-border-strong bg-surface-2 text-fg-3"
          )}
        >
          {STATUS_LABEL[claim.status]}
        </span>
      </div>
    </Link>
  )
}
