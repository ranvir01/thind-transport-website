import { Panel } from "@/components/hub/ui"

/**
 * Skeleton for /hub/safety. Mirrors the real page block for block — header +
 * action, the fleet-score panel, the hours-of-service panel, the DOT register,
 * the claims strip and the incident list — in the same Panels at the same
 * paddings, so the page does not jump when the six queries land.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* PageHeader: title + subtitle, action on the right */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="hub-skeleton h-7 w-24 rounded-control" />
          <div className="hub-skeleton mt-2 h-4 w-64 max-w-full rounded-control" />
        </div>
        <div className="hub-skeleton h-11 w-36 rounded-control" />
      </div>

      {/* Fleet safety score */}
      <Panel className="mb-4 p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="hub-skeleton h-4 w-4 rounded-full" />
          <div className="hub-skeleton h-4 w-40 rounded-control" />
        </div>
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div>
            <div className="hub-skeleton h-10 w-36 rounded-control" />
            <div className="hub-skeleton mt-1 h-3.5 w-44 max-w-full rounded-control" />
          </div>
          <div className="min-w-[180px] flex-1">
            <div className="hub-skeleton mb-1 h-3 w-24 rounded-control" />
            <div className="hub-skeleton h-12 w-full max-w-[220px] rounded-control" />
          </div>
          <div className="w-40">
            <div className="hub-skeleton mb-1 h-3 w-20 rounded-control" />
            <div className="space-y-1">
              <div className="hub-skeleton h-3.5 w-full rounded-control" />
              <div className="hub-skeleton h-3.5 w-full rounded-control" />
              <div className="hub-skeleton h-3.5 w-2/3 rounded-control" />
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <div className="hub-skeleton mb-1.5 h-3 w-20 rounded-control" />
          <div className="space-y-1">
            <div className="hub-skeleton h-10 rounded-control" />
            <div className="hub-skeleton h-10 rounded-control" />
            <div className="hub-skeleton h-10 rounded-control" />
          </div>
        </div>
      </Panel>

      {/* Hours of service */}
      <Panel className="mb-4 p-4 md:p-5">
        <div className="mb-2 flex items-center gap-2">
          <div className="hub-skeleton h-4 w-4 rounded-full" />
          <div className="hub-skeleton h-4 w-36 rounded-control" />
        </div>
        <div className="space-y-2">
          <div className="hub-skeleton h-[52px] rounded-control" />
          <div className="hub-skeleton h-[52px] rounded-control" />
          <div className="hub-skeleton h-[52px] rounded-control" />
        </div>
      </Panel>

      {/* DOT accident register */}
      <Panel className="mb-4 p-4 md:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="hub-skeleton h-4 w-4 rounded-full" />
            <div className="hub-skeleton h-4 w-44 rounded-control" />
          </div>
          <div className="hub-skeleton h-9 w-56 max-w-full rounded-control" />
        </div>
        <div className="hub-skeleton mb-3 h-8 w-full rounded-control" />
        <div className="space-y-2">
          <div className="hub-skeleton h-[52px] rounded-control" />
          <div className="hub-skeleton h-[52px] rounded-control" />
        </div>
      </Panel>

      {/* Claims rollup */}
      <Panel className="mb-4 p-0">
        <div className="flex items-center justify-between gap-2 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="hub-skeleton h-4 w-4 rounded-full" />
            <div className="hub-skeleton h-4 w-20 rounded-control" />
            <div className="hub-skeleton h-4 w-16 rounded-pill" />
          </div>
          <div className="hub-skeleton h-4 w-4 rounded-full" />
        </div>
      </Panel>

      {/* All incidents */}
      <div className="hub-skeleton mb-3 h-5 w-32 rounded-control" />
      <Panel className="divide-y divide-border">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between gap-2 p-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="hub-skeleton h-4 w-48 max-w-full rounded-control" />
              <div className="hub-skeleton h-3.5 w-64 max-w-full rounded-control" />
            </div>
            <div className="hub-skeleton h-5 w-16 shrink-0 rounded-pill" />
          </div>
        ))}
      </Panel>
    </div>
  )
}
