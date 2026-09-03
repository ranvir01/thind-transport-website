import { Panel } from "@/components/hub/ui"

/**
 * Mirrors CapacityPage → CapacityPanel: the xl two-column grid with the
 * posting form (four fields in a 2-col grid, one full-width field, a 48px
 * submit) on the left and the postings list on the right — same Panel
 * wrappers and paddings, so the real panels land without a shift.
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel className="p-4 md:p-5">
          <div className="hub-skeleton mb-3 h-5 w-48 rounded-control" />
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((field) => (
                <div key={field} className="hub-skeleton h-11 rounded-control md:h-9" />
              ))}
            </div>
            <div className="hub-skeleton h-11 rounded-control md:h-9" />
            <div className="hub-skeleton h-12 w-28 rounded-control" />
          </div>
        </Panel>

        <Panel className="divide-y divide-border">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center justify-between gap-2 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="hub-skeleton h-5 w-48 max-w-full rounded-control" />
                <div className="hub-skeleton mt-1 h-4 w-64 max-w-full rounded-control" />
              </div>
              <div className="hub-skeleton h-9 w-9 shrink-0 rounded-control" />
            </div>
          ))}
        </Panel>
      </div>
    </div>
  )
}
