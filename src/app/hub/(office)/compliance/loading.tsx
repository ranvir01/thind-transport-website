export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="hub-skeleton mb-4 h-7 w-48 rounded-control" />
      <div className="space-y-3">
        <div className="hub-skeleton h-[64px] rounded-card" />
        <div className="hub-skeleton h-[64px] rounded-card" />
        <div className="hub-skeleton h-[64px] rounded-card" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="hub-skeleton h-[84px] rounded-card" />
        <div className="hub-skeleton h-[84px] rounded-card" />
        <div className="hub-skeleton h-[84px] rounded-card" />
        <div className="hub-skeleton h-[84px] rounded-card" />
      </div>
    </div>
  )
}
