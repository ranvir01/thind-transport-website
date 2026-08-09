export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="hub-skeleton mb-4 h-7 w-48 rounded-control" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="hub-skeleton h-[112px] rounded-card" />
        <div className="hub-skeleton h-[112px] rounded-card" />
        <div className="hub-skeleton h-[112px] rounded-card" />
        <div className="hub-skeleton h-[112px] rounded-card" />
        <div className="hub-skeleton h-[112px] rounded-card" />
        <div className="hub-skeleton h-[112px] rounded-card" />
        <div className="hub-skeleton h-[112px] rounded-card" />
        <div className="hub-skeleton h-[112px] rounded-card" />
      </div>
    </div>
  )
}
