export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="hub-skeleton mb-4 h-7 w-48 rounded-control" />
      <div className="mb-4 flex gap-2">
        <div className="hub-skeleton h-8 w-20 rounded-pill" />
        <div className="hub-skeleton h-8 w-20 rounded-pill" />
        <div className="hub-skeleton h-8 w-20 rounded-pill" />
        <div className="hub-skeleton h-8 w-20 rounded-pill" />
      </div>
      <div className="rounded-card border border-border bg-surface p-4 shadow-card">
        <div className="space-y-2">
          <div className="hub-skeleton h-[56px] rounded-control" />
          <div className="hub-skeleton h-[56px] rounded-control" />
          <div className="hub-skeleton h-[56px] rounded-control" />
          <div className="hub-skeleton h-[56px] rounded-control" />
          <div className="hub-skeleton h-[56px] rounded-control" />
          <div className="hub-skeleton h-[56px] rounded-control" />
        </div>
      </div>
    </div>
  )
}
