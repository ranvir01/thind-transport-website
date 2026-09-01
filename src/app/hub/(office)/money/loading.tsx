export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="hub-skeleton h-7 w-48 rounded-control" />
        <div className="flex gap-2">
          <div className="hub-skeleton h-8 w-24 rounded-pill" />
          <div className="hub-skeleton h-8 w-24 rounded-pill" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="hub-skeleton h-[76px] rounded-card" />
        <div className="hub-skeleton h-[76px] rounded-card" />
        <div className="hub-skeleton h-[76px] rounded-card" />
        <div className="hub-skeleton h-[76px] rounded-card" />
        <div className="hub-skeleton h-[76px] rounded-card" />
      </div>
      <div className="hub-skeleton mt-4 h-[64px] rounded-card" />
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="hub-skeleton h-[92px] rounded-card" />
        <div className="hub-skeleton h-[92px] rounded-card" />
        <div className="hub-skeleton h-[92px] rounded-card" />
        <div className="hub-skeleton h-[92px] rounded-card" />
      </div>
      <div className="mt-4 rounded-card border border-border bg-surface p-4 shadow-card">
        <div className="hub-skeleton mb-3 h-5 w-32 rounded-control" />
        <div className="space-y-2">
          <div className="hub-skeleton h-[48px] rounded-control" />
          <div className="hub-skeleton h-[48px] rounded-control" />
          <div className="hub-skeleton h-[48px] rounded-control" />
          <div className="hub-skeleton h-[48px] rounded-control" />
          <div className="hub-skeleton h-[48px] rounded-control" />
        </div>
      </div>
    </div>
  )
}
