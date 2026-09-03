import { Panel } from "@/components/hub/ui"

/**
 * Mirrors InboxPage: a stack of draft cards — subject + sender line with a
 * confidence pill, a row of summary chips, then the action row — in the same
 * Panel wrappers and paddings, so the real queue lands without a shift.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="hub-skeleton h-7 w-24 rounded-control" />
          <div className="hub-skeleton mt-1 h-5 w-96 max-w-full rounded-control" />
        </div>
      </div>

      <ul className="space-y-3">
        {[0, 1, 2].map((row) => (
          <li key={row}>
            <Panel className="p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="hub-skeleton h-5 w-2/3 rounded-control" />
                  <div className="hub-skeleton mt-1 h-4 w-48 max-w-full rounded-control" />
                </div>
                <div className="hub-skeleton h-[22px] w-24 rounded-pill" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[0, 1, 2, 3].map((chip) => (
                  <div key={chip} className="hub-skeleton h-[22px] w-24 rounded-pill" />
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="hub-skeleton h-10 w-32 rounded-control" />
                <div className="hub-skeleton h-10 w-24 rounded-control" />
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  )
}
