import { Panel } from "@/components/hub/ui"

/**
 * Shared fallback for the whole (office) group: it covers Today AND every
 * office route without a loading.tsx of its own (settings/*, messages/*,
 * facilities, fuel, leads, loadboard, outreach, recruiting, setup, toolbox…).
 * Those all open with `PageHeader` — mb-6, a 22px title first, a 14px subtitle
 * under it — so the header block mirrors that shape rather than Today's
 * caption-above-greeting variant. The KPI row and the two panels below are the
 * generic office body; the real page lands on top of it without a shift.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="hub-skeleton h-7 w-44 rounded-control" />
          <div className="hub-skeleton mt-1 h-5 w-96 max-w-full rounded-control" />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <div key={tile} className="rounded-card border border-border bg-surface p-4 shadow-card">
            <div className="hub-skeleton h-[19px] w-24 rounded-control" />
            <div className="hub-skeleton mt-1 h-[38px] w-20 rounded-control" />
            <div className="hub-skeleton mt-1.5 h-5 w-28 rounded-pill" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[0, 1].map((panel) => (
          <Panel key={panel} className="p-4">
            <div className="hub-skeleton mb-2 h-5 w-40 rounded-control" />
            <div className="divide-y divide-border">
              {[0, 1, 2].map((row) => (
                <div key={row} className="py-2">
                  <div className="hub-skeleton h-[39px] rounded-control" />
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}
