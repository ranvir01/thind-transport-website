export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="hub-skeleton mb-4 h-7 w-48 rounded-control" />
      <div className="mb-3 flex gap-3">
        <div className="hub-skeleton h-5 w-28 rounded-control" />
        <div className="hub-skeleton h-5 w-28 rounded-control" />
        <div className="hub-skeleton h-5 w-28 rounded-control" />
        <div className="hub-skeleton h-5 w-28 rounded-control" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((col) => (
          <div key={col} className="space-y-3">
            <div className="hub-skeleton h-[96px] rounded-card" />
            <div className="hub-skeleton h-[96px] rounded-card" />
          </div>
        ))}
      </div>
    </div>
  )
}
