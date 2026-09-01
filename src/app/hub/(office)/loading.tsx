export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="hub-skeleton mb-4 h-7 w-48 rounded-control" />
      <div className="grid grid-cols-2 gap-3">
        <div className="hub-skeleton h-[84px] rounded-card" />
        <div className="hub-skeleton h-[84px] rounded-card" />
        <div className="hub-skeleton h-[84px] rounded-card" />
        <div className="hub-skeleton h-[84px] rounded-card" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((panel) => (
          <div key={panel} className="rounded-card border border-border bg-surface p-4 shadow-card">
            <div className="hub-skeleton mb-3 h-5 w-32 rounded-control" />
            <div className="space-y-2">
              <div className="hub-skeleton h-[52px] rounded-control" />
              <div className="hub-skeleton h-[52px] rounded-control" />
              <div className="hub-skeleton h-[52px] rounded-control" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
